-- Phase 1 needs the new request's id (not just its tracking_code) so the
-- browser can upload documents directly to a Storage path scoped to this
-- request. Return type changes from text to jsonb, so the function must be
-- dropped and recreated (create or replace can't change the return type).
drop function public.submit_request(uuid, text, text);

create function public.submit_request(p_service_id uuid, p_customer_name text, p_customer_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tracking_code text;
begin
  insert into public.requests (service_id, customer_name, customer_phone)
  values (p_service_id, p_customer_name, p_customer_phone)
  returning id, tracking_code into v_id, v_tracking_code;

  return jsonb_build_object('request_id', v_id, 'tracking_code', v_tracking_code);
end;
$$;

revoke all on function public.submit_request(uuid, text, text) from public;
grant execute on function public.submit_request(uuid, text, text) to anon, authenticated;
