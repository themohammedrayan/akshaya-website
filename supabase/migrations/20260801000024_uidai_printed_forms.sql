-- Audit log for the UIDAI overlay form printer (public/uidai-enr-form-printer/).
-- That tool is a static page with no login of its own, so writes come in as
-- anon - mirroring submit_request(), the insert is funneled through a
-- security definer RPC (never a direct anon insert policy) so reads stay
-- staff-only via RLS below.
create table public.uidai_printed_forms (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('form1-en', 'form3-en', 'form5-en')),
  applicant_name text,
  aadhaar_number text,
  record jsonb not null,
  printed_at timestamptz not null default now()
);

create index uidai_printed_forms_printed_at_idx on public.uidai_printed_forms (printed_at desc);

alter table public.uidai_printed_forms enable row level security;

-- No anon policy at all: writes only ever happen through log_printed_form()
-- below, which runs as security definer and bypasses RLS.
create policy "staff can read printed forms"
  on public.uidai_printed_forms for select
  to authenticated
  using (public.is_staff());

create function public.log_printed_form(p_form_type text, p_record jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.uidai_printed_forms (form_type, applicant_name, aadhaar_number, record)
  values (p_form_type, p_record->>'name', p_record->>'applicantAadhaar', p_record)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_printed_form(text, jsonb) from public;
grant execute on function public.log_printed_form(text, jsonb) to anon, authenticated;
