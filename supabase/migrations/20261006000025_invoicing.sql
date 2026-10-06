-- Invoicing / billing.
--
-- Every invoice line stores two amounts separately:
--   govt_fee       - money collected on the customer's behalf and paid on to
--                    the government/utility (property tax, KSEB bill,
--                    e-district fee). Pass-through, NOT the center's income.
--   service_charge - the center's own fee. This IS the center's income.
-- Reports sum them separately, so "total collected - govt pass-through =
-- our income" falls straight out of the data.
--
-- Same write model as the rest of the app: no insert/update policies on the
-- money tables at all - every write goes through a security definer RPC that
-- checks is_staff()/is_owner() itself, so a bill can't be half-written or
-- edited after the fact. Invoices are never deleted or edited, only
-- cancelled (owner-only), so the audit trail stays intact.

-- ---------------------------------------------------------------------------
-- services: billing defaults
-- ---------------------------------------------------------------------------
alter table public.services
  add column default_govt_fee numeric(10, 2) not null default 0 check (default_govt_fee >= 0),
  add column default_service_charge numeric(10, 2) not null default 0 check (default_service_charge >= 0),
  add column variable_govt_fee boolean not null default false,
  add column show_on_website boolean not null default true;

comment on column public.services.default_govt_fee is 'Govt/department fee passed through to the government. Ignored when variable_govt_fee (staff type the amount per bill).';
comment on column public.services.default_service_charge is 'Center''s own fixed charge. For variable_govt_fee services the charge comes from service_charge_slabs instead.';
comment on column public.services.variable_govt_fee is 'Tax/bill payments: the govt amount differs per customer and is typed at billing time; the service charge is then picked from the slabs.';
comment on column public.services.show_on_website is 'false = billing-only item (bill payments, photocopy, ...), hidden from the public storefront.';

-- Until the owner splits them on the Prices page, treat the whole existing
-- public fee as the center's own charge.
update public.services set default_service_charge = fee;

alter table public.services drop constraint services_category_check;
alter table public.services
  add constraint services_category_check
  check (category in ('e-district', 'aadhaar', 'other', 'bill-payment'));

drop policy "anyone can read active services" on public.services;
create policy "anyone can read active services"
  on public.services for select
  to anon, authenticated
  using (active = true and show_on_website = true);

-- Prices now drive billing, so only the owner may change services (staff
-- could otherwise quietly lower/raise the charge they bill).
drop policy "staff can write services" on public.services;
create policy "owner can write services"
  on public.services for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Service charge slabs ("bands") for variable-amount services
-- ---------------------------------------------------------------------------
-- Each row reads "govt amount up to <up_to> -> charge <charge>"; the single
-- row with up_to = null is "anything above that". Defined this way, a set of
-- slabs can never overlap or leave a gap. service_id = null is the default
-- set, used by every variable service that has no slabs of its own.
create table public.service_charge_slabs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services (id) on delete cascade,
  up_to numeric(10, 2) check (up_to is null or up_to > 0),
  charge numeric(10, 2) not null check (charge >= 0),
  created_at timestamptz not null default now()
);

create unique index service_charge_slabs_unique_idx
  on public.service_charge_slabs (
    coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(up_to, 'Infinity'::numeric)
  );

alter table public.service_charge_slabs enable row level security;

create policy "staff can read charge slabs"
  on public.service_charge_slabs for select
  to authenticated
  using (public.is_staff());

-- Per-unit service charge the center bills for a service, given the govt
-- amount. Single source of truth: the invoice form mirrors this logic for
-- the live preview, and create_invoice() re-checks every line against it.
create function public.service_charge_for(p_service_id uuid, p_govt_amount numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_charge numeric;
  v_slab_owner uuid;
begin
  select * into v_service from public.services where id = p_service_id;
  if not found then
    raise exception 'Unknown service %', p_service_id;
  end if;

  if not v_service.variable_govt_fee then
    return v_service.default_service_charge;
  end if;

  -- The service's own slabs if it has any, else the default (null) set.
  if exists (select 1 from public.service_charge_slabs where service_id = p_service_id) then
    v_slab_owner := p_service_id;
  elsif not exists (select 1 from public.service_charge_slabs where service_id is null) then
    return v_service.default_service_charge;
  end if;

  select charge into v_charge
  from public.service_charge_slabs
  where service_id is not distinct from v_slab_owner
    and (up_to is null or up_to >= p_govt_amount)
  order by up_to asc nulls last
  limit 1;

  return coalesce(v_charge, v_service.default_service_charge);
end;
$$;

-- Owner replaces a whole slab set at once (p_service_id null = default set).
-- An empty array removes a service's own set, so it falls back to defaults.
create function public.save_charge_slabs(p_service_id uuid, p_slabs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_ended int;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change service charges';
  end if;

  if coalesce(jsonb_typeof(p_slabs), '') <> 'array' then
    raise exception 'Slabs must be an array';
  end if;

  delete from public.service_charge_slabs where service_id is not distinct from p_service_id;

  if jsonb_array_length(p_slabs) = 0 then
    if p_service_id is null then
      raise exception 'The default slabs cannot be empty';
    end if;
    return;
  end if;

  select count(*) into v_open_ended
  from jsonb_array_elements(p_slabs) s
  where s->>'up_to' is null;

  if v_open_ended <> 1 then
    raise exception 'Exactly one slab must be "and above" (no upper limit)';
  end if;

  -- Duplicate up_to values / negative charges are rejected by the unique
  -- index and check constraints.
  insert into public.service_charge_slabs (service_id, up_to, charge)
  select p_service_id, (s->>'up_to')::numeric, (s->>'charge')::numeric
  from jsonb_array_elements(p_slabs) s;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invoice numbering: AKS/26-27/00001, sequential per Indian financial year
-- (April-March, Asia/Kolkata). The upsert takes a row lock, so concurrent
-- invoices can never get the same number.
-- ---------------------------------------------------------------------------
create table public.invoice_counters (
  fy text primary key,
  last_no int not null default 0
);

alter table public.invoice_counters enable row level security;
-- No policies: only next_invoice_no() (security definer) touches it.

create function public.next_invoice_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_start int;
  v_fy text;
  v_no int;
begin
  v_start := extract(year from v_today)::int - case when extract(month from v_today) < 4 then 1 else 0 end;
  v_fy := lpad((v_start % 100)::text, 2, '0') || '-' || lpad(((v_start + 1) % 100)::text, 2, '0');

  insert into public.invoice_counters (fy, last_no) values (v_fy, 1)
  on conflict (fy) do update set last_no = public.invoice_counters.last_no + 1
  returning last_no into v_no;

  return 'AKS/' || v_fy || '/' || lpad(v_no::text, 5, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Invoices, lines, payments
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_name text not null,
  customer_phone text,
  request_id uuid references public.requests (id) on delete set null,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  govt_total numeric(12, 2) not null default 0,
  service_total numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) generated always as (govt_total + service_total) stored,
  paid_total numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  cancel_reason text,
  cancelled_by uuid references public.profiles (id),
  cancelled_at timestamptz
);

comment on column public.invoices.govt_total is 'Sum of pass-through govt fees - not income.';
comment on column public.invoices.service_total is 'Sum of the center''s own service charges - this is income.';

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service_id uuid references public.services (id),
  description text not null,
  qty int not null default 1 check (qty > 0),
  -- Per-unit amounts, snapshotted at billing time so later price changes
  -- never alter an old bill.
  govt_fee numeric(10, 2) not null default 0 check (govt_fee >= 0),
  service_charge numeric(10, 2) not null default 0 check (service_charge >= 0),
  line_total numeric(12, 2) generated always as (qty * (govt_fee + service_charge)) stored,
  charge_overridden boolean not null default false,
  override_reason text,
  sort_order int not null default 0
);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  mode text not null check (mode in ('cash', 'upi', 'card')),
  amount numeric(12, 2) not null check (amount > 0),
  reference text,
  received_by uuid references public.profiles (id),
  received_at timestamptz not null default now()
);

create index invoices_created_at_idx on public.invoices (created_at desc);
create index invoices_request_id_idx on public.invoices (request_id);
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index invoice_payments_invoice_id_idx on public.invoice_payments (invoice_id);
create index invoice_payments_received_at_idx on public.invoice_payments (received_at);

-- Totals are derived from lines/payments by trigger, never trusted from input.
create function public.refresh_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i set
    govt_total = coalesce((select sum(qty * govt_fee) from public.invoice_items where invoice_id = v_invoice_id), 0),
    service_total = coalesce((select sum(qty * service_charge) from public.invoice_items where invoice_id = v_invoice_id), 0),
    paid_total = coalesce((select sum(amount) from public.invoice_payments where invoice_id = v_invoice_id), 0)
  where i.id = v_invoice_id;
  return null;
end;
$$;

create trigger invoice_items_refresh_totals
  after insert or update or delete on public.invoice_items
  for each row execute function public.refresh_invoice_totals();

create trigger invoice_payments_refresh_totals
  after insert or update or delete on public.invoice_payments
  for each row execute function public.refresh_invoice_totals();

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;

create policy "staff can read invoices"
  on public.invoices for select to authenticated using (public.is_staff());
create policy "staff can read invoice items"
  on public.invoice_items for select to authenticated using (public.is_staff());
create policy "staff can read invoice payments"
  on public.invoice_payments for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
-- p_invoice: {
--   customer_name, customer_phone?, request_id?, notes?,
--   items: [{ service_id?, description, qty, govt_fee, service_charge, override_reason? }],
--   payment?: { mode, amount, reference? }
-- }
-- For catalog items the server re-derives the amounts: a fixed service's govt
-- fee must match its default, and every service charge must match
-- service_charge_for(). Only the owner may bill a different amount, and only
-- with a reason (flagged in reports). Free-text lines (no service_id) take
-- the typed amounts as-is.
create function public.create_invoice(p_invoice jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_item jsonb;
  v_service public.services%rowtype;
  v_qty int;
  v_govt numeric;
  v_charge numeric;
  v_reason text;
  v_description text;
  v_overridden boolean;
  v_sort int := 0;
  v_grand numeric;
  v_payment jsonb := p_invoice->'payment';
  v_pay_amount numeric;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;

  if coalesce(trim(p_invoice->>'customer_name'), '') = '' then
    raise exception 'Customer name is required';
  end if;

  if coalesce(jsonb_typeof(p_invoice->'items'), '') <> 'array' or jsonb_array_length(p_invoice->'items') = 0 then
    raise exception 'Add at least one item';
  end if;

  insert into public.invoices (invoice_no, customer_name, customer_phone, request_id, notes, created_by)
  values (
    public.next_invoice_no(),
    trim(p_invoice->>'customer_name'),
    nullif(trim(coalesce(p_invoice->>'customer_phone', '')), ''),
    nullif(p_invoice->>'request_id', '')::uuid,
    nullif(trim(coalesce(p_invoice->>'notes', '')), ''),
    auth.uid()
  )
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_invoice->'items') loop
    v_qty := coalesce((v_item->>'qty')::int, 1);
    v_govt := round(coalesce((v_item->>'govt_fee')::numeric, 0), 2);
    v_charge := round(coalesce((v_item->>'service_charge')::numeric, 0), 2);
    v_reason := nullif(trim(coalesce(v_item->>'override_reason', '')), '');
    v_description := nullif(trim(coalesce(v_item->>'description', '')), '');
    v_overridden := false;

    if v_qty < 1 or v_govt < 0 or v_charge < 0 then
      raise exception 'Invalid quantity or amount';
    end if;

    if nullif(v_item->>'service_id', '') is not null then
      select * into v_service from public.services where id = (v_item->>'service_id')::uuid;
      if not found then
        raise exception 'Unknown service';
      end if;
      v_description := coalesce(v_description, v_service.name_en);

      if v_reason is not null then
        if not public.is_owner() then
          raise exception 'Only the owner can change a service charge';
        end if;
        v_overridden := true;
      else
        if not v_service.variable_govt_fee and v_govt <> v_service.default_govt_fee then
          raise exception 'Govt fee for "%" has changed - reload the page and try again', v_service.name_en;
        end if;
        if v_charge <> public.service_charge_for(v_service.id, v_govt) then
          raise exception 'Service charge for "%" has changed - reload the page and try again', v_service.name_en;
        end if;
      end if;
    elsif v_description is null then
      raise exception 'Custom items need a description';
    end if;

    insert into public.invoice_items
      (invoice_id, service_id, description, qty, govt_fee, service_charge, charge_overridden, override_reason, sort_order)
    values
      (v_invoice_id, nullif(v_item->>'service_id', '')::uuid, v_description, v_qty, v_govt, v_charge,
       v_overridden, v_reason, v_sort);
    v_sort := v_sort + 1;
  end loop;

  if v_payment is not null and jsonb_typeof(v_payment) = 'object' then
    v_pay_amount := round(coalesce((v_payment->>'amount')::numeric, 0), 2);
    if v_pay_amount > 0 then
      select grand_total into v_grand from public.invoices where id = v_invoice_id;
      if v_pay_amount > v_grand then
        raise exception 'Payment is more than the bill total';
      end if;
      insert into public.invoice_payments (invoice_id, mode, amount, reference, received_by)
      values (v_invoice_id, v_payment->>'mode', v_pay_amount,
              nullif(trim(coalesce(v_payment->>'reference', '')), ''), auth.uid());
    end if;
  end if;

  return v_invoice_id;
end;
$$;

create function public.add_invoice_payment(p_invoice_id uuid, p_mode text, p_amount numeric, p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if v_invoice.status <> 'issued' then
    raise exception 'This invoice is cancelled';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount';
  end if;
  if v_invoice.paid_total + round(p_amount, 2) > v_invoice.grand_total then
    raise exception 'Payment is more than the balance due';
  end if;

  insert into public.invoice_payments (invoice_id, mode, amount, reference, received_by)
  values (p_invoice_id, p_mode, round(p_amount, 2), nullif(trim(coalesce(p_reference, '')), ''), auth.uid());
end;
$$;

create function public.cancel_invoice(p_invoice_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can cancel invoices';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  update public.invoices
  set status = 'cancelled', cancel_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = now()
  where id = p_invoice_id and status = 'issued';

  if not found then
    raise exception 'Invoice not found or already cancelled';
  end if;
end;
$$;

-- Owner's money report for an inclusive IST date range.
--   billed:      invoices raised in the range (by invoice date) - the income
--                split. Credit sales count here even if unpaid.
--   collected:   payments received in the range (by payment date), by mode -
--                what should be in the drawer / bank.
--   outstanding: all unpaid balances as of now.
-- Cancelled invoices are excluded throughout (and counted separately).
create function public.financial_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can view reports';
  end if;

  with inv as (
    select * from public.invoices
    where (created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  ),
  pay as (
    select p.* from public.invoice_payments p
    join public.invoices i on i.id = p.invoice_id
    where i.status = 'issued'
      and (p.received_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  )
  select jsonb_build_object(
    'billed', (
      select jsonb_build_object(
        'count', count(*),
        'govt_total', coalesce(sum(govt_total), 0),
        'service_total', coalesce(sum(service_total), 0),
        'grand_total', coalesce(sum(grand_total), 0)
      ) from inv where status = 'issued'
    ),
    'cancelled_count', (select count(*) from inv where status = 'cancelled'),
    'collected', (
      select jsonb_build_object(
        'total', coalesce(sum(amount), 0),
        'cash', coalesce(sum(amount) filter (where mode = 'cash'), 0),
        'upi', coalesce(sum(amount) filter (where mode = 'upi'), 0),
        'card', coalesce(sum(amount) filter (where mode = 'card'), 0)
      ) from pay
    ),
    'outstanding', (
      select jsonb_build_object(
        'count', count(*),
        'total', coalesce(sum(grand_total - paid_total), 0)
      ) from public.invoices where status = 'issued' and paid_total < grand_total
    ),
    'overrides', (
      select count(*) from public.invoice_items it
      join inv on inv.id = it.invoice_id
      where inv.status = 'issued' and it.charge_overridden
    ),
    'by_service', coalesce((
      select jsonb_agg(row_to_json(s) order by s.service_total desc)
      from (
        select
          coalesce(sv.name_en, 'Other / custom items') as name,
          sum(it.qty) as qty,
          sum(it.qty * it.govt_fee) as govt_total,
          sum(it.qty * it.service_charge) as service_total
        from public.invoice_items it
        join inv on inv.id = it.invoice_id and inv.status = 'issued'
        left join public.services sv on sv.id = it.service_id
        group by coalesce(sv.name_en, 'Other / custom items')
      ) s
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: callable RPCs to signed-in users only, never anon;
-- internal helpers to nobody.
-- ---------------------------------------------------------------------------
revoke all on function public.service_charge_for(uuid, numeric) from public, anon;
revoke all on function public.save_charge_slabs(uuid, jsonb) from public, anon;
revoke all on function public.create_invoice(jsonb) from public, anon;
revoke all on function public.add_invoice_payment(uuid, text, numeric, text) from public, anon;
revoke all on function public.cancel_invoice(uuid, text) from public, anon;
revoke all on function public.financial_summary(date, date) from public, anon;
grant execute on function public.service_charge_for(uuid, numeric) to authenticated;
grant execute on function public.save_charge_slabs(uuid, jsonb) to authenticated;
grant execute on function public.create_invoice(jsonb) to authenticated;
grant execute on function public.add_invoice_payment(uuid, text, numeric, text) to authenticated;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
grant execute on function public.financial_summary(date, date) to authenticated;

revoke all on function public.next_invoice_no() from public, anon, authenticated;
revoke all on function public.refresh_invoice_totals() from public, anon, authenticated;
