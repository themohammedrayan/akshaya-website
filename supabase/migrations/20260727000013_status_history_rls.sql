alter table public.status_history enable row level security;

-- Append-only by omission: no update/delete policy exists for anyone.
create policy "staff can read status history"
  on public.status_history for select
  to authenticated
  using (public.is_staff());

create policy "staff can add status history notes"
  on public.status_history for insert
  to authenticated
  with check (public.is_staff());

-- No anon policies - the log_status_history trigger writes as its
-- definer (postgres), which bypasses RLS entirely, so the public intake
-- insert can still produce the initial "submitted" row.
