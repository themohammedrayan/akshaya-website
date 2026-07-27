create index requests_status_idx on public.requests (status);
create index requests_service_id_idx on public.requests (service_id);
create index requests_assigned_to_idx on public.requests (assigned_to);
create index requests_created_at_idx on public.requests (created_at);
create index status_history_request_id_idx on public.status_history (request_id);
