-- Automatically logs every status transition, regardless of whether it came
-- from the public intake insert, a dashboard update, or a manual Studio
-- edit. security definer so it can write to status_history even when the
-- caller is `anon` (who has no direct insert grant on that table).
create function public.log_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (request_id, status, is_internal, changed_by)
    values (new.id, new.status, false, null);
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.status_history (request_id, status, is_internal, changed_by)
    values (new.id, new.status, false, auth.uid());
  end if;
  return new;
end;
$$;

create trigger requests_log_status_history
  after insert or update of status on public.requests
  for each row
  execute function public.log_status_history();
