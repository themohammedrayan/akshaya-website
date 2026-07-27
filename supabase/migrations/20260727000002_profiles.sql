-- Staff/owner profiles, 1:1 with auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Staff and owner accounts. One row per auth.users id.';
