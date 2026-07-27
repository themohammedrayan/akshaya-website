create table public.requests (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique,
  service_id uuid not null references public.services (id),
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'docs_verified',
      'in_progress',
      'needs_customer_action',
      'completed',
      'delivered',
      'cancelled'
    )
  ),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- tracking_code is always generated server-side (see the tracking_code
-- migration's trigger) - it is nullable here only because it doesn't exist
-- until that trigger runs on insert.

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger requests_set_updated_at
  before update on public.requests
  for each row
  execute function public.set_updated_at();
