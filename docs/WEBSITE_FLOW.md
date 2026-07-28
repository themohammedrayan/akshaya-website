# Website Flow

A quick map of how a request moves through this app, end to end. For architecture/stack/data-model
detail, see the root `README.md` — this doc is about the *flow*, not the file tree.

There are two journeys that share the same `requests` row: the **customer journey** (anonymous,
public) and the **staff journey** (authenticated, dashboard). They never touch the same UI, only
the same database row.

## 1. Customer journey (public, no login)

```
/  (landing)
 └─▶ /services              browse catalog
      └─▶ /services/[slug]  service detail (fee, docs required, processing time)
           └─▶ /request?service=[slug]   intake form (preselects the service)

/request  (IntakeContent.tsx)
  1. Customer picks a service, enters name + phone.
  2. Submit calls the `submitRequest` server action → RPC `submit_request(service_id, name, phone)`.
     - This is the ONLY way a `requests` row gets created. No direct table insert (RLS blocks it).
     - Returns { request_id, tracking_code } (tracking code format: AKS-XXXX).
  3. On success, the form swaps to a success screen showing the tracking code, and — if the
     service has `required_docs` — a document upload slot per required doc.
  4. Each upload (DocumentUpload.tsx) goes straight from the browser to Supabase Storage
     (bucket `request-docs`), NOT through a server action (payload size limits). After the
     Storage upload succeeds, it calls RPC `record_uploaded_document(request_id, doc_label,
     storage_path)` to log it in `request_documents`.
     - Uploads only work while the request is still `status = 'submitted'` and recently created
       (storage RLS enforces this). There's no re-upload flow later if staff ask for a document
       again — known gap.
  5. Customer is pointed to /status to check progress later.

/status  (StatusContent.tsx)
  - Customer enters tracking code + phone.
  - Calls `lookupStatus` server action → RPC `get_request_status(tracking_code, phone)`.
    - Matches on tracking code + last 10 digits of phone; generic "not found" on any mismatch
      (no enumeration of valid codes).
    - Returns current status + service names + `status_history` entries where
      `is_internal = false` only (staff-internal notes never leak here).
```

Nothing on this side ever requires auth. Everything a customer can do is either public data
(`services`) or funneled through a `security definer` RPC — there is intentionally no public
SELECT/INSERT policy on `requests`, `request_documents`, or `status_history`.

## 2. Staff journey (authenticated, dashboard)

```
/login
  - Plain email+password sign-in via supabase.auth.signInWithPassword (client-side).
  - On success, redirects to ?redirect=... or /dashboard.

proxy.ts (middleware) + dashboard/layout.tsx
  - proxy.ts refreshes the Supabase session cookie on every request.
  - dashboard/layout.tsx checks supabase.auth.getUser(); no user → redirect to /login.
  - Then looks up a `profiles` row for that user. No row → "account not set up" screen
    (there is no self-serve signup; staff accounts are provisioned manually in Supabase Studio,
    see README "Provisioning staff accounts").

/dashboard  (queue)
  - Lists all `requests` (staff RLS grants full read), filterable by status / service /
    assigned staff / date via querystring.
  - Each row links to /dashboard/[id].

/dashboard/[id]  (request detail)
  - Shows customer info, current status, uploaded documents (viewed via short-lived signed
    Storage URLs generated server-side — never a public bucket URL).
  - "Update status" form → `updateStatus` action → updates `requests.status`. A DB trigger
    auto-logs the transition into `status_history` with `is_internal = false` (customer-visible
    by default).
  - Status transitions are constrained client-side by NEXT_STATUSES map in
    `dashboard/[id]/page.tsx`:
      submitted → docs_verified | needs_customer_action | cancelled
      docs_verified → in_progress | needs_customer_action | cancelled
      in_progress → completed | needs_customer_action | cancelled
      needs_customer_action → in_progress | cancelled
      completed → delivered | cancelled
      delivered / cancelled → terminal
  - "Add a note" form → `addNote` action → inserts directly into `status_history`.
    Defaults to `is_internal = true` (hidden from /status) unless staff explicitly check
    "visible to customer on the status page".
  - "Message customer" button → builds a wa.me link (buildStatusMessage() in
    lib/whatsappTemplates.ts) pre-filled with tracking code + status; opens WhatsApp for the
    staff member to send manually. Not an automated notification system (yet).
  - "Assignment" form → `assignRequest` action → sets `requests.assigned_to` to a staff
    profile id.
```

## 3. One request's lifecycle, start to finish

```
Customer                          System                              Staff
--------                          ------                              -----
fills /request form        →      submit_request() RPC creates
                                   requests row (status=submitted,
                                   tracking_code auto-generated)
uploads ID docs             →      Storage + record_uploaded_document()
                                                                        sees new row in /dashboard queue
                                                                        opens /dashboard/[id], reviews docs
                                                                        sets status → docs_verified/in_progress
checks /status              ←      get_request_status() RPC returns
(sees status + public                current status + public history
 history notes)                                                        adds internal notes as needed
                                                                        eventually sets → completed → delivered
```

## Key files by responsibility

| Concern | File |
|---|---|
| Public layout (header/footer/lang) | `src/app/(public)/layout.tsx` |
| Intake form + upload UI | `src/components/IntakeContent.tsx`, `src/components/DocumentUpload.tsx` |
| Intake server action | `src/app/(public)/request/actions.ts` |
| Status lookup UI/action | `src/components/StatusContent.tsx`, `src/app/(public)/status/actions.ts` |
| Session refresh (all routes) | `src/proxy.ts` → `src/lib/supabase/proxy.ts` |
| Staff auth gate | `src/app/dashboard/layout.tsx` |
| Staff login | `src/app/login/page.tsx` |
| Queue + filters | `src/app/dashboard/page.tsx` |
| Request detail + status/notes/assignment | `src/app/dashboard/[id]/page.tsx`, `src/app/dashboard/[id]/actions.ts` |
| Document signed-URL viewer | `src/components/dashboard/DocumentViewer.tsx` |
| WhatsApp message builder | `src/lib/whatsappTemplates.ts`, `src/components/dashboard/WhatsAppMessageButton.tsx` |
| DB schema + RLS | `supabase/migrations/*.sql` (applied in filename order) |
| Generated DB types | `src/lib/types/database.types.ts` |

## Things to know before touching this flow

- **Next.js 16 breaking changes apply** (see `AGENTS.md`): `middleware.ts` is `proxy.ts`, and
  `params`/`searchParams` are async everywhere — check `node_modules/next/dist/docs/` before
  assuming older Next.js conventions.
- Every public mutation goes through a `security definer` RPC, never a direct table
  insert/update from the browser — that's deliberate, not an oversight, because RLS on
  `requests`/`request_documents`/`status_history` gives `anon` zero direct access.
- `status_history` rows are either trigger-generated (status changes, `is_internal = false`) or
  staff-written (`addNote`, defaults `is_internal = true`). The `/status` page only ever sees
  `is_internal = false` rows.
- Not built yet: re-upload flow after `needs_customer_action`, automated WhatsApp sending,
  services catalog admin UI, online payment. See README "Roadmap" before assuming a feature
  exists.
