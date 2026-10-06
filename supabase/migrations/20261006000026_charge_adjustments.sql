-- Editable service charges: extra (e.g. customer leaves the change) and
-- discounts (e.g. bulk work), by any staff member, always tracked.
--
-- Govt fees stay exact - adjustments only ever move the service charge
-- (the center's income), and a bill can never be discounted into its govt
-- fees. Two places an adjustment can live:
--   * per line:  invoice_items.service_charge differs from standard_charge
--                (the price-list/band charge at billing time). Lower needs a
--                reason.
--   * per bill:  invoices.extra_amount / discount_amount. A discount needs a
--                reason.
-- Only additive changes / create-or-replace here (no object removal).

alter table public.invoice_items
  add column standard_charge numeric(10, 2) check (standard_charge is null or standard_charge >= 0);

comment on column public.invoice_items.standard_charge is 'Price-list / band service charge per unit at billing time (null for custom lines). service_charge below this = discount, above = extra.';

alter table public.invoices
  add column extra_amount numeric(12, 2) not null default 0 check (extra_amount >= 0),
  add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  add column adjustment_reason text;

comment on column public.invoices.extra_amount is 'Bill-level extra kept by the center (e.g. no change to give). Counted as service charge income.';
comment on column public.invoices.discount_amount is 'Bill-level discount off the service charges (never off govt fees).';

-- service_total now includes the bill-level adjustment, so grand_total
-- (govt_total + service_total) and every report stay correct unchanged.
create or replace function public.refresh_invoice_totals()
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
    service_total = coalesce((select sum(qty * service_charge) from public.invoice_items where invoice_id = v_invoice_id), 0)
      + i.extra_amount - i.discount_amount,
    paid_total = coalesce((select sum(amount) from public.invoice_payments where invoice_id = v_invoice_id), 0)
  where i.id = v_invoice_id;
  return null;
end;
$$;

-- p_invoice: {
--   customer_name, customer_phone?, request_id?, notes?,
--   extra?, discount?, adjustment_reason?,
--   items: [{ service_id?, description, qty, govt_fee, service_charge, override_reason? }],
--   payment?: { mode, amount, reference? }
-- }
create or replace function public.create_invoice(p_invoice jsonb)
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
  v_standard numeric;
  v_reason text;
  v_description text;
  v_sort int := 0;
  v_grand numeric;
  v_payment jsonb := p_invoice->'payment';
  v_pay_amount numeric;
  v_extra numeric := round(coalesce((p_invoice->>'extra')::numeric, 0), 2);
  v_discount numeric := round(coalesce((p_invoice->>'discount')::numeric, 0), 2);
  v_adj_reason text := nullif(trim(coalesce(p_invoice->>'adjustment_reason', '')), '');
  v_line_charges numeric := 0;
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

  if v_extra < 0 or v_discount < 0 then
    raise exception 'Invalid extra or discount';
  end if;
  if v_extra > 0 and v_discount > 0 then
    raise exception 'A bill can have an extra or a discount, not both';
  end if;
  if v_discount > 0 and v_adj_reason is null then
    raise exception 'Give a reason for the discount';
  end if;

  insert into public.invoices
    (invoice_no, customer_name, customer_phone, request_id, notes, created_by, extra_amount, discount_amount, adjustment_reason)
  values (
    public.next_invoice_no(),
    trim(p_invoice->>'customer_name'),
    nullif(trim(coalesce(p_invoice->>'customer_phone', '')), ''),
    nullif(p_invoice->>'request_id', '')::uuid,
    nullif(trim(coalesce(p_invoice->>'notes', '')), ''),
    auth.uid(),
    v_extra,
    v_discount,
    case when v_extra > 0 or v_discount > 0 then v_adj_reason end
  )
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_invoice->'items') loop
    v_qty := coalesce((v_item->>'qty')::int, 1);
    v_govt := round(coalesce((v_item->>'govt_fee')::numeric, 0), 2);
    v_charge := round(coalesce((v_item->>'service_charge')::numeric, 0), 2);
    v_reason := nullif(trim(coalesce(v_item->>'override_reason', '')), '');
    v_description := nullif(trim(coalesce(v_item->>'description', '')), '');
    v_standard := null;

    if v_qty < 1 or v_govt < 0 or v_charge < 0 then
      raise exception 'Invalid quantity or amount';
    end if;

    if nullif(v_item->>'service_id', '') is not null then
      select * into v_service from public.services where id = (v_item->>'service_id')::uuid;
      if not found then
        raise exception 'Unknown service';
      end if;
      v_description := coalesce(v_description, v_service.name_en);

      -- Govt fees are pass-through: only the owner may change a fixed one.
      if not v_service.variable_govt_fee and v_govt <> v_service.default_govt_fee and not public.is_owner() then
        raise exception 'Govt fee for "%" has changed - reload the page and try again', v_service.name_en;
      end if;

      -- Any staff member may bill a different service charge; lower needs a reason.
      v_standard := public.service_charge_for(v_service.id, v_govt);
      if v_charge < v_standard and v_reason is null then
        raise exception 'Give a reason for the discount on "%"', v_service.name_en;
      end if;
    elsif v_description is null then
      raise exception 'Custom items need a description';
    end if;

    insert into public.invoice_items
      (invoice_id, service_id, description, qty, govt_fee, service_charge, standard_charge,
       charge_overridden, override_reason, sort_order)
    values
      (v_invoice_id, nullif(v_item->>'service_id', '')::uuid, v_description, v_qty, v_govt, v_charge, v_standard,
       v_standard is not null and v_charge <> v_standard,
       case when v_standard is not null and v_charge <> v_standard then v_reason end,
       v_sort);
    v_sort := v_sort + 1;
    v_line_charges := v_line_charges + v_qty * v_charge;
  end loop;

  if v_discount > v_line_charges then
    raise exception 'Discount can only come off the service charge (max %), not govt fees', v_line_charges;
  end if;

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

-- Adds 'adjustments' (discounts given / extra collected, line + bill level)
-- and a bill-level row in by_service so that table still sums to income.
create or replace function public.financial_summary(p_from date, p_to date)
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
  ),
  line_adj as (
    select
      it.invoice_id,
      sum(greatest(it.qty * (it.standard_charge - it.service_charge), 0)) as discount,
      sum(greatest(it.qty * (it.service_charge - it.standard_charge), 0)) as extra
    from public.invoice_items it
    join inv on inv.id = it.invoice_id and inv.status = 'issued'
    where it.standard_charge is not null
    group by it.invoice_id
  ),
  adj as (
    select
      inv.id,
      inv.discount_amount + coalesce(l.discount, 0) as discount,
      inv.extra_amount + coalesce(l.extra, 0) as extra
    from inv left join line_adj l on l.invoice_id = inv.id
    where inv.status = 'issued'
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
    'adjustments', (
      select jsonb_build_object(
        'discount_total', coalesce(sum(discount), 0),
        'discount_bills', count(*) filter (where discount > 0),
        'extra_total', coalesce(sum(extra), 0),
        'extra_bills', count(*) filter (where extra > 0)
      ) from adj
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
        union all
        select 'Bill-level extra / discount', null, 0, sum(extra_amount - discount_amount)
        from inv
        where status = 'issued' and (extra_amount > 0 or discount_amount > 0)
        having count(*) > 0
      ) s
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
