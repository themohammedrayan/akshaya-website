-- Bug: the harden_function_privileges migration revoked EXECUTE on
-- generate_tracking_code() from anon/authenticated, but set_tracking_code()
-- (the BEFORE INSERT trigger on requests, called by anon during public
-- intake) is not security definer and calls generate_tracking_code()
-- directly - so anon inserts started failing with "permission denied for
-- function generate_tracking_code". Fix: make the trigger function
-- security definer so it runs with the owner's privileges regardless of
-- the inserting role, matching the pattern already used for
-- log_status_history().
create or replace function public.set_tracking_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.tracking_code := public.generate_tracking_code();
  return new;
end;
$$;

revoke all on function public.set_tracking_code() from public, anon, authenticated;
