-- The only sanctioned way for an unauthenticated customer to read anything
-- about their request. Matches on tracking_code + phone (last 10 digits,
-- so +91/spaces/hyphens don't matter) and returns a generic "not found" on
-- any mismatch rather than distinguishing "wrong code" from "wrong phone",
-- to avoid tracking-code enumeration.
create function public.get_request_status(p_tracking_code text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_last10 text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_request public.requests%rowtype;
  v_service public.services%rowtype;
  v_history jsonb;
begin
  if p_tracking_code is null or length(v_phone_last10) < 10 then
    return null;
  end if;

  select * into v_request
  from public.requests
  where tracking_code = upper(trim(p_tracking_code))
    and right(regexp_replace(customer_phone, '\D', '', 'g'), 10) = v_phone_last10;

  if not found then
    return null;
  end if;

  select * into v_service from public.services where id = v_request.service_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'note', note,
      'changed_at', changed_at
    ) order by changed_at asc
  ), '[]'::jsonb)
  into v_history
  from public.status_history
  where request_id = v_request.id and is_internal = false;

  return jsonb_build_object(
    'tracking_code', v_request.tracking_code,
    'status', v_request.status,
    'service_name_en', v_service.name_en,
    'service_name_ml', v_service.name_ml,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at,
    'history', v_history
  );
end;
$$;

revoke all on function public.get_request_status(text, text) from public;
grant execute on function public.get_request_status(text, text) to anon, authenticated;
