-- Records a document the browser already uploaded directly to Storage
-- (see storage_rls migration for the matching upload-side check). Mirrors
-- submit_request/get_request_status: security definer, so anon never needs
-- a direct RLS policy on request_documents. Re-validates the same
-- "submitted and recent" condition as the Storage policy, and checks the
-- path actually belongs to this request, so a caller can't record an
-- arbitrary storage_path pointing at someone else's file.
create function public.record_uploaded_document(p_request_id uuid, p_doc_label text, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.requests
    where id = p_request_id
      and status = 'submitted'
      and created_at > now() - interval '1 hour'
  ) then
    raise exception 'Request not found or no longer accepting uploads';
  end if;

  if p_storage_path is null or p_storage_path !~ ('^' || p_request_id::text || '/') then
    raise exception 'Storage path does not match request';
  end if;

  insert into public.request_documents (request_id, doc_label, storage_path)
  values (p_request_id, p_doc_label, p_storage_path);
end;
$$;

revoke all on function public.record_uploaded_document(uuid, text, text) from public;
grant execute on function public.record_uploaded_document(uuid, text, text) to anon, authenticated;
