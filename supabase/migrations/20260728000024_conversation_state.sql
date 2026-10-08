-- Per-phone-number conversation state for the WhatsApp intake bot (Phase 1).
-- Only the whatsapp-bot Edge Function (service_role) ever reads or writes
-- this table. Unlike every other table in this schema there are
-- deliberately zero RLS policies: service_role bypasses RLS entirely, and
-- no other role should ever need access, so "RLS enabled, no policies" is
-- the correct default-deny posture here (no RPC escape hatch needed since
-- this table is never customer- or staff-facing).
create table public.conversation_state (
  phone            text primary key,
  language         text check (language in ('en', 'ml')),
  flow             text check (flow in ('intake', 'status')),
  current_service  uuid references public.services (id),
  request_id       uuid references public.requests (id),
  step             text,
  draft            jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

comment on table public.conversation_state is
  'Ephemeral per-phone-number WhatsApp bot session state. Written only by the whatsapp-bot Edge Function via service_role. Not part of the audit trail -- status_history is still written exclusively by the log_status_history trigger.';

alter table public.conversation_state enable row level security;
-- No policies: service_role bypasses RLS; every other role is denied by default.

create trigger conversation_state_set_updated_at
  before update on public.conversation_state
  for each row
  execute function public.set_updated_at();
