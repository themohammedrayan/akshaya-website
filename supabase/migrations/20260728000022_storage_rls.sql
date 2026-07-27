-- storage.objects RLS for the request-docs bucket. Path convention:
-- '{request_id}/{slugified-doc-label}-{timestamp}.{ext}' - the first path
-- segment (storage.foldername(name))[1] is the owning request's id.
--
-- anon can INSERT (upload) only under a request that is still 'submitted'
-- and recently created - same window as record_uploaded_document, so the
-- Storage write and the request_documents row it produces are governed by
-- matching rules. No anon SELECT policy: the upload response already
-- returns the path, so nothing needs to be read back.
create policy "anon can upload to a live submitted request"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'request-docs'
    and exists (
      select 1 from public.requests
      where id::text = (storage.foldername(name))[1]
        and status = 'submitted'
        and created_at > now() - interval '1 hour'
    )
  );

-- Staff need full access to view (dashboard viewer, via signed URLs) and
-- manage documents for any request.
create policy "staff can manage request documents in storage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'request-docs' and public.is_staff())
  with check (bucket_id = 'request-docs' and public.is_staff());
