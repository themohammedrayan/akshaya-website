-- Bug: the app's intake flow does insert().select("tracking_code").single(),
-- which is an INSERT ... RETURNING under the hood. Postgres RLS requires a
-- SELECT policy to satisfy RETURNING (default-deny applies when none
-- exists), and anon has no SELECT policy on requests at all - by design,
-- per "no public read on requests" - so every anon insert-with-RETURNING
-- failed with "new row violates row-level security policy for table
-- requests", even though the INSERT WITH CHECK itself was satisfiable.
--
-- Fix: route public submission through a security definer RPC, mirroring
-- get_request_status. The function inserts with a hardcoded status of
-- 'submitted' and no assignment, then returns only the tracking_code -
-- never a full row - so no SELECT policy on requests is ever needed for
-- anon. This also removes the now-superseded direct anon INSERT policy,
-- so public write access to `requests` is entirely funneled through this
-- one audited path.
create function public.submit_request(p_service_id uuid, p_customer_name text, p_customer_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_code text;
begin
  insert into public.requests (service_id, customer_name, customer_phone)
  values (p_service_id, p_customer_name, p_customer_phone)
  returning tracking_code into v_tracking_code;

  return v_tracking_code;
end;
$$;

revoke all on function public.submit_request(uuid, text, text) from public;
grant execute on function public.submit_request(uuid, text, text) to anon, authenticated;

drop policy "anyone can submit a request" on public.requests;
