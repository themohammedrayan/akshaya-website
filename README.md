# Akshaya e-Center Website

A Next.js + Supabase app for an Akshaya e-Center in Kerala: a bilingual (English/Malayalam)
public storefront and intake flow, a public tracking-code status page, and an authenticated
staff dashboard for managing the request queue. This is the **Phase 0** build — see
[Roadmap](#roadmap-phase-1--phase-2-not-built-yet) for what's intentionally deferred.

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
  migrations/     18 SQL migrations, applied in filename order (see below)
  seed.sql        Services catalog seed data (idempotent, safe to re-run)
src/
  app/
    (public)/     Landing, /services, /services/[slug], /request, /status - share Header/Footer
    login/        Staff sign-in (standalone, no header/footer)
    dashboard/    Staff-only queue + request detail (protected by proxy.ts + layout check)
  components/     Shared UI (Header, Footer, StatusBadge, WhatsAppButton, LanguageToggle, ...)
  lib/
    supabase/     Browser client, server client, and the proxy.ts session-refresh helper
    i18n/         en.json/ml.json dictionaries + LanguageProvider (cookie-persisted, no
                   locale-prefixed routes - see brief §6 for why)
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
- Public write access goes through two `security definer` RPCs only — never direct table
  access:
  - `submit_request(service_id, name, phone)` → inserts a `requests` row server-side and
    returns just the tracking code. (Earlier iteration tried a direct anon `INSERT ...
    RETURNING`-style insert; Postgres RLS requires a SELECT policy to satisfy `RETURNING`,
    and anon intentionally has none on `requests` - so that path always failed. The RPC avoids
    needing a public SELECT policy entirely.)
  - `get_request_status(tracking_code, phone)` → the only way to read a request without
    signing in. Matches on tracking code + last-10-digits-of-phone, returns a generic
    "not found" on any mismatch (no enumeration), and only returns `status_history` rows where
    `is_internal = false`.
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
- Full data-path (tracking code generation, status trigger, both RPCs, RLS enforcement for
  `anon` including negative cases) was verified directly against the live Supabase project
  via SQL, including a bug found and fixed mid-build (see `submit_request_rpc` migration
  comment).
- Browser QA of the public pages was limited by this build environment's network policy,
  which blocks outbound HTTPS to `*.supabase.co` from the sandboxed dev server - so
  data-dependent pages couldn't be exercised end-to-end in a real browser here. The static
  parts (landing page, language toggle, mobile nav - which had a real "nav hidden entirely on
  phones" bug that's now fixed) were verified in a headless browser. **Do a manual click-through
  of the full intake → dashboard → status flow after deploying**, since that's the one thing
  this build couldn't fully verify itself.

## Roadmap (Phase 1 / Phase 2, not built yet)

- Document uploads in intake (`request_documents` table already exists, unused) + inline
  viewer in the dashboard.
- Automated WhatsApp notifications via a template-based provider (manual "copy message"
  helper is the Phase 0 stopgap).
- Aadhaar form-filler staff module.
- Services catalog admin UI in the dashboard (Phase 0 manages it via `seed.sql` + Studio).
- Online fee payment, analytics/reporting.

See the original build brief for full detail on all three phases.
