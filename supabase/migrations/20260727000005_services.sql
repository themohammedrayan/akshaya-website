create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ml text not null,
  category text not null check (category in ('e-district', 'aadhaar', 'other')),
  fee numeric(10, 2) not null default 0,
  processing_time text not null,
  required_docs jsonb not null default '[]'::jsonb,
  description_en text not null default '',
  description_ml text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.services.required_docs is 'Array of {en, ml} document label objects.';

alter table public.services enable row level security;

-- Storefront + intake need to read active services without being signed in.
create policy "anyone can read active services"
  on public.services for select
  to anon, authenticated
  using (active = true);

-- Staff (via Studio, or a future admin UI) also need to see inactive rows.
create policy "staff can read all services"
  on public.services for select
  to authenticated
  using (public.is_staff());

create policy "staff can write services"
  on public.services for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
