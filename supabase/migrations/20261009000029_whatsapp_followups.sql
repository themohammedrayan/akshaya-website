-- WhatsApp info bot + staff follow-up list.
--
-- The bot (src/app/api/whatsapp/route.ts) is an information and callback
-- channel: customers browse services and their required documents in
-- Malayalam, and either tap "call me" or send a message the bot can't
-- handle. Both land here as an enquiry that staff call back from
-- /dashboard/followups. One open enquiry per phone - repeat messages update
-- it instead of piling up new rows.
--
-- The webhook writes with the service-role key (it has no user session), so
-- whatsapp_sessions / whatsapp_messages deliberately have no RLS policies at
-- all: nothing but the service role can touch them.
-- Only additive changes here.

-- Switch for letting a service be applied for over WhatsApp later. Unused for
-- now: every service is info + callback only.
alter table public.services
  add column online_enabled boolean not null default false;

comment on column public.services.online_enabled is 'Reserved: true = customers can apply for this service online via the WhatsApp bot. Not used yet.';

-- ---------------------------------------------------------------------------
-- Enquiries (follow-ups)
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'whatsapp' check (source in ('whatsapp')),
  phone text not null check (phone ~ '^\d{10}$'),
  wa_id text,
  name text,
  service_id uuid references public.services (id),
  kind text not null check (kind in ('callback', 'message')),
  last_message text,
  message_count int not null default 1,
  status text not null default 'new' check (status in ('new', 'follow_up', 'visited', 'closed')),
  follow_up_on date,
  request_id uuid references public.requests (id),
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.enquiries.phone is 'Last 10 digits, same normalization as get_request_status.';
comment on column public.enquiries.kind is 'callback = customer tapped "call me"; message = free text / voice / photo the bot could not handle.';
comment on column public.enquiries.request_id is 'Reserved for linking an enquiry to the request it turned into.';

create unique index enquiries_one_open_per_phone_idx
  on public.enquiries (phone)
  where status in ('new', 'follow_up');

create index enquiries_status_follow_up_on_idx on public.enquiries (status, follow_up_on);
create index enquiries_created_at_idx on public.enquiries (created_at);

create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row
  execute function public.set_updated_at();

alter table public.enquiries enable row level security;

create policy "staff can read enquiries"
  on public.enquiries for select to authenticated using (public.is_staff());

create policy "staff can add enquiries"
  on public.enquiries for insert to authenticated with check (public.is_staff());

create policy "staff can update enquiries"
  on public.enquiries for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Call log
-- ---------------------------------------------------------------------------
create table public.enquiry_calls (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  outcome text not null check (outcome in ('talked', 'no_answer', 'call_again', 'visited', 'not_interested')),
  note text,
  called_by uuid references public.profiles (id),
  called_at timestamptz not null default now()
);

create index enquiry_calls_enquiry_id_idx on public.enquiry_calls (enquiry_id, called_at);

alter table public.enquiry_calls enable row level security;

create policy "staff can read enquiry calls"
  on public.enquiry_calls for select to authenticated using (public.is_staff());

create policy "staff can log enquiry calls"
  on public.enquiry_calls for insert to authenticated with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Bot state (service role only)
-- ---------------------------------------------------------------------------
create table public.whatsapp_sessions (
  wa_id text primary key,
  step text not null default 'menu',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.whatsapp_sessions is 'Where each WhatsApp number is in the bot menu. Written only by the webhook (service role).';

alter table public.whatsapp_sessions enable row level security;

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  wa_message_id text unique,
  wa_id text not null,
  direction text not null check (direction in ('in', 'out')),
  type text not null,
  body text,
  created_at timestamptz not null default now()
);

comment on table public.whatsapp_messages is 'Message log for de-duplicating webhook retries and debugging. Text only - media is never stored. Written only by the webhook (service role).';

create index whatsapp_messages_wa_id_idx on public.whatsapp_messages (wa_id, created_at);

alter table public.whatsapp_messages enable row level security;
