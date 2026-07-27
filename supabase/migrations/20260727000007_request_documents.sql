-- Created now so the schema/RLS shape is in place; unused until Phase 1
-- adds document uploads to the intake flow.
create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  storage_path text not null,
  doc_label text not null,
  uploaded_at timestamptz not null default now()
);
