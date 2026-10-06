# Akshaya e-Center Website

A Next.js + Supabase app for an Akshaya e-Center in Kerala: a bilingual (English/Malayalam)
public storefront and intake flow (with document uploads), a public tracking-code status page,
and an authenticated staff dashboard for managing the request queue (with a document viewer and
a WhatsApp message helper). **Phase 0 and Phase 1 (uploads + WhatsApp helper)** are built — see
[Roadmap](#roadmap-phase-1--phase-2-not-built-yet) for what's still intentionally deferred (the
Aadhaar form-filler module and Phase 2 items).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4). Note: this project was scaffolded
  with Next.js 16, which renamed `middleware.ts` → `proxy.ts` and made `params`/`searchParams`
  fully async — if you're used to older Next.js versions, skim `node_modules/next/dist/docs/`
  before making structural changes.
- **Supabase** (Postgres + Auth), accessed via `@supabase/supabase-js` + `@supabase/ssr`.
- No separate backend — all mutations go through Server Actions or security-definer RPCs.

## Project structure

```
supabase/
  migrations/     23 SQL migrations, applied in filename order (see below)
  seed.sql        Services catalog seed data (idempotent, safe to re-run)
src/
  app/
    (public)/     Landing, /services, /services/[slug], /request, /status - share Header/Footer
    login/        Staff sign-in (standalone, no header/footer)
    dashboard/    Staff-only queue + request detail (protected by proxy.ts + layout check)
  components/
    dashboard/    DocumentViewer, WhatsAppMessageButton - dashboard-only, plain English
    DocumentUpload.tsx  Per-document upload slot used in the intake success screen
    ...           Header, Footer, StatusBadge, WhatsAppButton, LanguageToggle, ...
  lib/
    supabase/     Browser client, server client, and the proxy.ts session-refresh helper
    i18n/         en.json/ml.json dictionaries + LanguageProvider (cookie-persisted, no
                   locale-prefixed routes - see brief §6 for why)
    whatsappTemplates.ts  buildStatusMessage() + phone formatting for the dashboard's
                   "Message customer" button - deliberately minimal, not a templating system
    types/        Generated Supabase types (database.types.ts)
```

## Local setup

1. **Install dependencies**: `npm install`
2. **Supabase project**: this repo is already wired to a live Supabase project
   (`ishxtpxlpqcuemlrnesp`, region `ap-south-1`) with all migrations and seed data applied.
   Copy `.env.example` to `.env.local` and fill in the URL/anon key from
   Supabase dashboard → Settings → API (or ask the project owner for `.env.local`).
   To start a **new** project instead: `supabase init`, `supabase link`, then apply every file
   in `supabase/migrations/` in filename order (they're numbered/dated for exactly this), then
   run `supabase/seed.sql`.
3. **Run**: `npm run dev` → http://localhost:3000

### Provisioning staff accounts (manual, by design for Phase 0)

There's no signup UI. To add a staff/owner login:

1. Supabase Dashboard → Authentication → Users → **Add user** (set email + password).
2. Copy the new user's UUID.
3. Run in the SQL editor:
   ```sql
   insert into public.profiles (id, name, role) values ('<uuid>', 'Staff Name', 'staff');
   -- role is 'owner' or 'staff'
   ```
4. They can now sign in at `/login` and reach `/dashboard`.

Logging in without a `profiles` row shows an "account not set up" message instead of crashing.

## Data model & security

Five tables: `services`, `requests`, `request_documents` (unused until Phase 1 uploads),
`status_history`, `profiles`. Full schema and RLS policy comments are in
`supabase/migrations/`. The short version:

- `services`: public can read `active = true` rows; only staff can write.
- `requests` / `request_documents` / `status_history`: **no public read policy exists at
  all.** Staff (role `owner`/`staff` via a `profiles` row) get full read/write through RLS
  policies backed by `is_staff()` / `is_owner()` helper functions.
- Public write access goes through `security definer` RPCs only — never direct table access:
  - `submit_request(service_id, name, phone)` → inserts a `requests` row server-side and
    returns `{request_id, tracking_code}`. (Earlier iteration tried a direct anon `INSERT ...
    RETURNING`-style insert; Postgres RLS requires a SELECT policy to satisfy `RETURNING`,
    and anon intentionally has none on `requests` - so that path always failed. The RPC avoids
    needing a public SELECT policy entirely.) `request_id` exists so the browser can scope
    document uploads to this specific request (see below).
  - `get_request_status(tracking_code, phone)` → the only way to read a request without
    signing in. Matches on tracking code + last-10-digits-of-phone, returns a generic
    "not found" on any mismatch (no enumeration), and only returns `status_history` rows where
    `is_internal = false`.
  - `record_uploaded_document(request_id, doc_label, storage_path)` → records a document the
    browser already uploaded directly to Storage. Re-validates the request is still `submitted`
    and recent, and that `storage_path` actually belongs to `request_id`, before inserting into
    `request_documents`.
- **Document uploads** go straight from the browser to a private `request-docs` Storage bucket
  (not proxied through a Server Action - Vercel's function payload limit is too small for
  phone-camera photos of ID documents). A `storage.objects` RLS policy scopes anon inserts to a
  path prefixed with a `requests.id` that is still `submitted` and recently created. That
  policy needed its own helper: `exists (select ... from public.requests ...)` inside an RLS
  predicate runs *as the calling role*, and since anon has zero SELECT visibility into
  `requests` by design, a naive subquery there always evaluates false - the exact same class of
  bug as the `submit_request`/`RETURNING` issue above. Fixed with a
  `request_accepts_uploads(request_id)` security-definer helper, the same pattern as
  `is_staff()`/`is_owner()`. Staff read documents via short-lived signed URLs generated
  server-side in the dashboard (`createSignedUrl`), never a public bucket URL.
- Every status transition on `requests` is auto-logged to `status_history` by a trigger
  (`is_internal = false`, i.e. customer-visible by default). Staff-written notes are separate
  inserts and default to `is_internal = true` (hidden from `/status`) unless a staff member
  explicitly checks "visible to customer" in the dashboard.
- Tracking codes (`AKS-XXXX`) are always generated server-side by a trigger, never accepted
  from the client, using an alphabet that excludes `0/O/1/I/L` to avoid transcription errors.

Run `mcp__Supabase__get_advisors` (security) periodically - the only WARNs it should ever show
are the three security-definer functions being callable by `anon`/`authenticated`, which is
intentional (that's the whole point of `submit_request` and `get_request_status`, and
`is_staff()`/`is_owner()` must be callable by `authenticated` for RLS policies to evaluate).

## Invoicing (staff dashboard)

`/dashboard/invoices` - billing for walk-ins and website requests, printed on half an A4 sheet.

- **Income vs pass-through.** Every invoice line stores `govt_fee` (collected on the customer's
  behalf and paid on to the department/utility - *not* income) and `service_charge` (the
  center's own fee - *the* income) separately. Reports sum them separately, so
  `total collected - govt pass-through = our income`.
- **Service charge bands.** Bill/tax items (`services.variable_govt_fee`) have staff type only the
  bill amount; the charge comes from `service_charge_slabs` ("up to ₹X -> ₹Y", plus one "above"
  band; a service's own bands override the default set). Fixed items use
  `services.default_govt_fee` / `default_service_charge`. `public.service_charge_for()` is the
  single source of truth and `create_invoice()` rejects any line that doesn't match it, unless
  the owner overrides it with a reason (flagged in reports). `src/lib/billing.ts` mirrors it for
  the live preview - keep the two in sync.
- **Payments.** Cash / UPI / Card, or Credit (no payment yet; balance tracked, part-payments
  recorded later). Invoice numbers are `AKS/<FY>/<n>`, sequential per April-March year.
- **No edits or deletes.** Invoices are only cancelled (owner-only, reason required); the number
  is never reused and cancelled bills drop out of all totals.
- **Owner-only:** `/dashboard/reports` (billed income split, money received by mode for drawer
  reconciliation, credit dues, per-service table, CSV export) and `/dashboard/prices` (prices,
  bands, billing-only items). Services are now owner-write only.
- Center name/CSC ID/address/phone on the printed bill live in `src/lib/center.ts`; logo is
  `public/akshaya-logo.png`.
- Migration: `20261006000025_invoicing.sql`. Billing-only items and **placeholder** default
  bands are in `seed.sql` - set the real bands on the Prices page before use.

## i18n

Simple dictionary approach (`src/lib/i18n/en.json` / `ml.json`) + a cookie-persisted React
context, not `next-intl` - no locale-prefixed routes, since most bilingual content already
lives in the DB as `name_en`/`name_ml` column pairs. **The Malayalam UI/seed text is a
best-effort translation and has not been reviewed by a native speaker** - do that before a
real launch, especially for the service names/required-document lists that customers will
rely on.

## Known placeholders to replace before launch

- `.env.local` center contact info (`NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CENTER_PHONE`,
  `NEXT_PUBLIC_CENTER_ADDRESS`, `NEXT_PUBLIC_CENTER_HOURS`) are placeholder values - update to
  match the Google Business Profile exactly (brief §7: NAP consistency matters for ads/SEO).
- `supabase/seed.sql` fees and processing times are placeholders pending confirmation against
  the actual current government fee schedule.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` /
  `..._CONVERSION_LABEL_INTAKE` / `..._CONVERSION_LABEL_WHATSAPP` are blank (analytics wiring
  is env-gated and silently no-ops until these are set).

## Testing

- `npm run lint` / `npx tsc --noEmit` / `npm run build` all pass.
- Full data-path (tracking code generation, status trigger, all RPCs, RLS enforcement for
  `anon` including negative cases) was verified directly against the live Supabase project via
  SQL. Two real bugs were found and fixed this way before they'd have hit production:
  - Phase 0: `submit_request`'s original `insert().select()` pattern failed under RLS (see
    `submit_request_rpc` migration).
  - Phase 1: the Storage upload RLS policy's `exists (select ... from requests ...)` subquery
    always evaluated false for `anon`, because that subquery is itself subject to `requests`'
    RLS and anon has no SELECT policy there (see `fix_storage_rls_requests_check` migration).
  - Lesson for future migrations: any RLS predicate that queries another RLS-protected table
    needs a `security definer` helper (like `is_staff()`, `is_owner()`,
    `request_accepts_uploads()`) - a raw subquery runs as the calling role and silently
    self-defeats.
- Browser QA of pages that need live Supabase data is limited by this build environment's
  network policy, which blocks outbound HTTPS to `*.supabase.co` from the sandboxed dev server.
  The static parts (landing page, language toggle, mobile nav) were verified in a headless
  browser. **Do a manual click-through of the full intake (with an upload) → dashboard (viewing
  the document, using the WhatsApp button) → status flow after deploying**, since that's the
  one thing this build couldn't fully verify itself.
- Two harmless orphaned `storage.objects` metadata rows may exist in the live project from SQL-level
  RLS testing (direct-SQL inserts used to simulate uploads; direct-SQL deletes on storage tables
  are blocked by Supabase, so cleanup needs the Storage API/dashboard, not SQL) - safe to ignore
  or delete via Studio's Storage browser.

## Roadmap (not built yet)

- **Aadhaar form-filler staff module** - explicitly out of scope so far; there's no template or
  spec to build against yet (the brief references separate "layout work already started" that
  isn't in this repo). Once a Form 1 template/reference exists, the likely shape is a staff-only
  `/dashboard` route + `pdf-lib` to overlay text onto the existing PDF for printing.
- **Re-upload after `needs_customer_action`** - uploads currently only work in the initial
  post-submit window (`status = 'submitted'`, request created within the last hour). If staff
  need a customer to send a document later, there's no flow for that yet - known gap, not
  silently decided either way.
- Automated WhatsApp notifications via a template-based provider (the dashboard's "Message
  customer" button, which opens a pre-filled `wa.me` link for manual sending, is the stopgap).
- Services catalog admin UI in the dashboard (currently managed via `seed.sql` + Studio).
- Online fee payment (Phase 2).

See the original build brief for full detail on all phases.
