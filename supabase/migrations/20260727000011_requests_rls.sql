alter table public.requests enable row level security;

-- Public intake: anyone can create a request, but only in the initial
-- unassigned/submitted state. No public select policy exists at all -
-- reading a request back requires either staff auth or the
-- get_request_status RPC (security definer, scoped to one row).
create policy "anyone can submit a request"
  on public.requests for insert
  to anon, authenticated
  with check (status = 'submitted' and assigned_to is null);

create policy "staff can read all requests"
  on public.requests for select
  to authenticated
  using (public.is_staff());

create policy "staff can update requests"
  on public.requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff can delete requests"
  on public.requests for delete
  to authenticated
  using (public.is_staff());
