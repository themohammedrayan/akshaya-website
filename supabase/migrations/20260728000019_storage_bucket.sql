-- Private bucket for intake document uploads (Phase 1). Never public - all
-- reads go through staff RLS + signed URLs generated server-side in the
-- dashboard, matching the "no public read" posture already used for
-- requests/status_history.
insert into storage.buckets (id, name, public)
values ('request-docs', 'request-docs', false)
on conflict (id) do nothing;
