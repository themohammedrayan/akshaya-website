-- Supabase grants EXECUTE on new public-schema functions to anon/authenticated
-- by default (via schema default privileges), which is separate from the
-- `revoke all ... from public` already done in earlier migrations. Lock down
-- the functions that are internal-only (trigger functions and the is_staff/
-- is_owner helpers, which should only ever be called from inside RLS
-- policies, not invoked directly as an RPC).
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_owner() from anon;

revoke all on function public.log_status_history() from public, anon, authenticated;
revoke all on function public.set_tracking_code() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.generate_tracking_code() from public, anon, authenticated;

-- Pin search_path on the remaining functions that didn't already set one.
alter function public.set_tracking_code() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.generate_tracking_code() set search_path = public;
