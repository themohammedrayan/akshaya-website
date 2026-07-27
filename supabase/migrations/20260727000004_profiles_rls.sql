alter table public.profiles enable row level security;

-- Any signed-in staff member can see who else is on the team (needed to
-- populate the "assign to" dropdown in the dashboard).
create policy "staff can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

-- Only the owner can provision/edit/remove staff accounts.
create policy "owner can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.is_owner());

create policy "owner can update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "owner can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_owner());
