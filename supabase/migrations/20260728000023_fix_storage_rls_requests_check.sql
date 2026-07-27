-- Bug: the "anon can upload" storage.objects policy did
-- `exists (select 1 from public.requests where ...)` directly. That
-- subquery runs AS the calling role (anon), and anon has zero SELECT
-- visibility into `requests` by design (no public read policy exists) -
-- so the exists() always evaluated to false regardless of the request's
-- actual state, rejecting every upload. Same root cause as the
-- submit_request_rpc fix: an RLS predicate that queries another
-- RLS-protected table needs a security definer helper to bypass that
-- table's RLS for just this check, the same way is_staff()/is_owner() do.
create function public.request_accepts_uploads(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.requests
    where id = p_request_id
      and status = 'submitted'
      and created_at > now() - interval '1 hour'
  );
$$;

revoke all on function public.request_accepts_uploads(uuid) from public;
grant execute on function public.request_accepts_uploads(uuid) to anon, authenticated;

drop policy "anon can upload to a live submitted request" on storage.objects;

create policy "anon can upload to a live submitted request"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'request-docs'
    and public.request_accepts_uploads(((storage.foldername(name))[1])::uuid)
  );
