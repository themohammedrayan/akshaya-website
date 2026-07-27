alter table public.request_documents enable row level security;

-- No anon policies at all - uploads are a Phase 1 feature and will get
-- their own scoped policy when they're built.
create policy "staff can manage request documents"
  on public.request_documents for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
