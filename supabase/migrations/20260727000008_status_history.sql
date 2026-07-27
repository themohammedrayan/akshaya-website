create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  status text not null,
  note text,
  -- Defaults to hidden. System-generated status-change rows are inserted
  -- with is_internal = false (customer-visible); staff-authored notes
  -- default to internal and require an explicit opt-in to show on /status.
  is_internal boolean not null default true,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);
