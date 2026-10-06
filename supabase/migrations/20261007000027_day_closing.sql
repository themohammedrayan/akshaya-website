-- Daily closing: compare expected vs actual balances in the three places
-- money sits - cash drawer, bank, and the portal wallet.
--
-- Each close starts from the actual balances of the previous close (or the
-- one-time opening balances) and adds everything since:
--   cash   += cash received on bills; -/+ money movements
--   bank   += UPI/card received up to the day BEFORE the close date (they
--             settle T+1); - govt fees of bank-paid services; -/+ movements
--   wallet -= govt fees of wallet-paid services; -/+ movements (top-ups)
-- UPI/card received on the close date itself is reported as pending.
--
-- Staff enter the counted/actual balances first and only then see the
-- expected figures (blind count). Nothing is ever deleted: mistakes in money
-- movements are cancelled, closes are reopened (kept for history).
-- Only additive changes / create-or-replace here.

alter table public.services
  add column govt_paid_from text not null default 'bank' check (govt_paid_from in ('bank', 'wallet'));

comment on column public.services.govt_paid_from is 'Where the center pays this service''s govt fee from: bank account or the portal wallet. Drives expected balances in the daily close.';

-- ---------------------------------------------------------------------------
-- Money movements that aren't customer bills
-- ---------------------------------------------------------------------------
create table public.money_movements (
  id uuid primary key default gen_random_uuid(),
  moved_at timestamptz not null default now(),
  kind text not null check (kind in ('expense', 'deposit', 'withdrawal', 'topup')),
  from_account text not null check (from_account in ('cash', 'bank', 'wallet')),
  to_account text check (to_account in ('cash', 'bank', 'wallet')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancel_reason text,
  created_by uuid references public.profiles (id),
  cancelled_by uuid references public.profiles (id),
  check (from_account is distinct from to_account)
);

create index money_movements_moved_at_idx on public.money_movements (moved_at);

alter table public.money_movements enable row level security;

create policy "staff can read money movements"
  on public.money_movements for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Day closings
-- ---------------------------------------------------------------------------
create table public.day_closings (
  id uuid primary key default gen_random_uuid(),
  close_date date not null,
  is_opening boolean not null default false,
  status text not null default 'closed' check (status in ('closed', 'reopened')),
  actual_cash numeric(12, 2) not null,
  actual_bank numeric(12, 2) not null,
  actual_wallet numeric(12, 2) not null,
  expected_cash numeric(12, 2) not null,
  expected_bank numeric(12, 2) not null,
  expected_wallet numeric(12, 2) not null,
  upi_pending numeric(12, 2) not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  note text,
  closed_by uuid references public.profiles (id),
  closed_at timestamptz not null default now(),
  reopened_by uuid references public.profiles (id),
  reopened_at timestamptz
);

comment on column public.day_closings.breakdown is 'How the expected figures were built (receipts, govt fees, movements per account) - shown to the owner.';

create unique index day_closings_one_per_day_idx on public.day_closings (close_date) where status = 'closed';

alter table public.day_closings enable row level security;

create policy "owner can read day closings"
  on public.day_closings for select to authenticated using (public.is_owner());

-- ---------------------------------------------------------------------------
-- Expected balances for p_date, from the latest close before it
-- ---------------------------------------------------------------------------
create function public.day_close_expected(p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prev public.day_closings%rowtype;
  v_cash_in numeric; v_upi_in numeric; v_upi_pending numeric;
  v_govt_bank numeric; v_govt_wallet numeric;
  v_mov jsonb;
  v_out_cash numeric; v_out_bank numeric; v_out_wallet numeric;
  v_in_cash numeric; v_in_bank numeric; v_in_wallet numeric;
begin
  select * into v_prev from public.day_closings
  where status = 'closed' and close_date < p_date
  order by close_date desc limit 1;
  if not found then
    return null;
  end if;

  -- Customer payments (cancelled bills excluded).
  select
    coalesce(sum(p.amount) filter (where p.mode = 'cash'
      and (p.received_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
      and (p.received_at at time zone 'Asia/Kolkata')::date <= p_date), 0),
    -- UPI/card settle T+1: received from the previous close date up to the day before p_date.
    coalesce(sum(p.amount) filter (where p.mode in ('upi', 'card')
      and (p.received_at at time zone 'Asia/Kolkata')::date >= v_prev.close_date
      and (p.received_at at time zone 'Asia/Kolkata')::date < p_date), 0),
    coalesce(sum(p.amount) filter (where p.mode in ('upi', 'card')
      and (p.received_at at time zone 'Asia/Kolkata')::date = p_date), 0)
  into v_cash_in, v_upi_in, v_upi_pending
  from public.invoice_payments p
  join public.invoices i on i.id = p.invoice_id and i.status = 'issued';

  -- Every close (opening included) is taken as "end of that day, before that
  -- day's UPI/card settled", which is why the window above starts AT the
  -- previous close date.

  -- Govt fees paid out, by where the service's fee is paid from.
  select
    coalesce(sum(it.qty * it.govt_fee) filter (where coalesce(s.govt_paid_from, 'bank') = 'bank'), 0),
    coalesce(sum(it.qty * it.govt_fee) filter (where s.govt_paid_from = 'wallet'), 0)
  into v_govt_bank, v_govt_wallet
  from public.invoice_items it
  join public.invoices i on i.id = it.invoice_id and i.status = 'issued'
  left join public.services s on s.id = it.service_id
  where (i.created_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
    and (i.created_at at time zone 'Asia/Kolkata')::date <= p_date;

  -- Other money movements.
  select
    coalesce(sum(amount) filter (where from_account = 'cash'), 0),
    coalesce(sum(amount) filter (where from_account = 'bank'), 0),
    coalesce(sum(amount) filter (where from_account = 'wallet'), 0),
    coalesce(sum(amount) filter (where to_account = 'cash'), 0),
    coalesce(sum(amount) filter (where to_account = 'bank'), 0),
    coalesce(sum(amount) filter (where to_account = 'wallet'), 0),
    jsonb_build_object(
      'expense', coalesce(sum(amount) filter (where kind = 'expense'), 0),
      'deposit', coalesce(sum(amount) filter (where kind = 'deposit'), 0),
      'withdrawal', coalesce(sum(amount) filter (where kind = 'withdrawal'), 0),
      'topup', coalesce(sum(amount) filter (where kind = 'topup'), 0)
    )
  into v_out_cash, v_out_bank, v_out_wallet, v_in_cash, v_in_bank, v_in_wallet, v_mov
  from public.money_movements
  where status = 'active'
    and (moved_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
    and (moved_at at time zone 'Asia/Kolkata')::date <= p_date;

  return jsonb_build_object(
    'since', v_prev.close_date,
    'opening', jsonb_build_object('cash', v_prev.actual_cash, 'bank', v_prev.actual_bank, 'wallet', v_prev.actual_wallet),
    'expected_cash', v_prev.actual_cash + v_cash_in - v_out_cash + v_in_cash,
    'expected_bank', v_prev.actual_bank + v_upi_in - v_govt_bank - v_out_bank + v_in_bank,
    'expected_wallet', v_prev.actual_wallet - v_govt_wallet - v_out_wallet + v_in_wallet,
    'upi_pending', v_upi_pending,
    'breakdown', jsonb_build_object(
      'cash_received', v_cash_in,
      'upi_card_settled', v_upi_in,
      'govt_fees_bank', v_govt_bank,
      'govt_fees_wallet', v_govt_wallet,
      'movements', v_mov
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.add_money_movement(p_kind text, p_from text, p_to text, p_amount numeric, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount';
  end if;
  -- Each kind has a fixed shape so the balances stay meaningful.
  if (p_kind = 'expense' and (p_to is not null))
     or (p_kind = 'deposit' and (p_from <> 'cash' or p_to is distinct from 'bank'))
     or (p_kind = 'withdrawal' and (p_from not in ('cash', 'bank') or p_to is not null))
     or (p_kind = 'topup' and (p_from not in ('cash', 'bank') or p_to is distinct from 'wallet')) then
    raise exception 'Invalid accounts for this kind of entry';
  end if;
  if p_kind = 'expense' and coalesce(trim(p_note), '') = '' then
    raise exception 'Say what the expense was for';
  end if;

  insert into public.money_movements (kind, from_account, to_account, amount, note, created_by)
  values (p_kind, p_from, p_to, round(p_amount, 2), nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.cancel_money_movement(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can cancel entries';
  end if;
  update public.money_movements
  set status = 'cancelled', cancel_reason = nullif(trim(coalesce(p_reason, '')), ''), cancelled_by = auth.uid()
  where id = p_id and status = 'active';
  if not found then
    raise exception 'Entry not found or already cancelled';
  end if;
end;
$$;

create function public.set_opening_balances(p_date date, p_cash numeric, p_bank numeric, p_wallet numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can set opening balances';
  end if;
  if exists (select 1 from public.day_closings where status = 'closed') then
    raise exception 'Opening balances are already set';
  end if;
  insert into public.day_closings
    (close_date, is_opening, actual_cash, actual_bank, actual_wallet, expected_cash, expected_bank, expected_wallet, note, closed_by)
  values
    (p_date, true, coalesce(p_cash, 0), coalesce(p_bank, 0), coalesce(p_wallet, 0),
     coalesce(p_cash, 0), coalesce(p_bank, 0), coalesce(p_wallet, 0), 'Opening balances', auth.uid());
end;
$$;

-- Saves the close and only then returns expected vs actual (blind count).
create function public.close_day(p_date date, p_cash numeric, p_bank numeric, p_wallet numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp jsonb;
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  if p_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Cannot close a future day';
  end if;
  if p_cash is null or p_bank is null or p_wallet is null then
    raise exception 'Enter all three balances';
  end if;
  if exists (select 1 from public.day_closings where status = 'closed' and close_date >= p_date) then
    raise exception 'This day (or a later one) is already closed';
  end if;

  v_exp := public.day_close_expected(p_date);
  if v_exp is null then
    raise exception 'Opening balances have not been set yet - ask the owner';
  end if;

  insert into public.day_closings
    (close_date, actual_cash, actual_bank, actual_wallet, expected_cash, expected_bank, expected_wallet,
     upi_pending, breakdown, closed_by)
  values
    (p_date, round(p_cash, 2), round(p_bank, 2), round(p_wallet, 2),
     (v_exp->>'expected_cash')::numeric, (v_exp->>'expected_bank')::numeric, (v_exp->>'expected_wallet')::numeric,
     (v_exp->>'upi_pending')::numeric, v_exp->'breakdown', auth.uid())
  returning id into v_id;

  return public.day_close_result(p_date);
end;
$$;

-- Today's close as seen by whoever did it (staff can't read the table).
create function public.day_close_result(p_date date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_staff() then null else (
    select jsonb_build_object(
      'close_date', c.close_date,
      'actual', jsonb_build_object('cash', c.actual_cash, 'bank', c.actual_bank, 'wallet', c.actual_wallet),
      'expected', jsonb_build_object('cash', c.expected_cash, 'bank', c.expected_bank, 'wallet', c.expected_wallet),
      'difference', jsonb_build_object(
        'cash', c.actual_cash - c.expected_cash,
        'bank', c.actual_bank - c.expected_bank,
        'wallet', c.actual_wallet - c.expected_wallet),
      'upi_pending', c.upi_pending,
      'breakdown', c.breakdown,
      'note', c.note,
      'closed_at', c.closed_at
    )
    from public.day_closings c
    where c.close_date = p_date and c.status = 'closed' and not c.is_opening
  ) end;
$$;

-- Whether opening balances exist, and the last closed date (no amounts).
create function public.day_close_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_staff() then null else jsonb_build_object(
    'has_opening', exists (select 1 from public.day_closings where status = 'closed'),
    'last_close_date', (select max(close_date) from public.day_closings where status = 'closed')
  ) end;
$$;

create function public.set_closing_note(p_date date, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  update public.day_closings
  set note = nullif(trim(coalesce(p_note, '')), '')
  where close_date = p_date and status = 'closed' and not is_opening;
  if not found then
    raise exception 'No close found for that day';
  end if;
end;
$$;

-- Owner reopens the latest close so it can be counted again (kept for history).
create function public.reopen_day(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can reopen a day';
  end if;
  if exists (select 1 from public.day_closings where status = 'closed' and close_date > p_date) then
    raise exception 'Reopen the later days first';
  end if;
  update public.day_closings
  set status = 'reopened', reopened_by = auth.uid(), reopened_at = now()
  where close_date = p_date and status = 'closed' and not is_opening;
  if not found then
    raise exception 'No close found for that day';
  end if;
end;
$$;

revoke all on function public.day_close_expected(date) from public, anon, authenticated;
revoke all on function public.add_money_movement(text, text, text, numeric, text) from public, anon;
revoke all on function public.cancel_money_movement(uuid, text) from public, anon;
revoke all on function public.set_opening_balances(date, numeric, numeric, numeric) from public, anon;
revoke all on function public.close_day(date, numeric, numeric, numeric) from public, anon;
revoke all on function public.day_close_result(date) from public, anon;
revoke all on function public.day_close_status() from public, anon;
revoke all on function public.set_closing_note(date, text) from public, anon;
revoke all on function public.reopen_day(date) from public, anon;
grant execute on function public.add_money_movement(text, text, text, numeric, text) to authenticated;
grant execute on function public.cancel_money_movement(uuid, text) to authenticated;
grant execute on function public.set_opening_balances(date, numeric, numeric, numeric) to authenticated;
grant execute on function public.close_day(date, numeric, numeric, numeric) to authenticated;
grant execute on function public.day_close_result(date) to authenticated;
grant execute on function public.day_close_status() to authenticated;
grant execute on function public.set_closing_note(date, text) to authenticated;
grant execute on function public.reopen_day(date) to authenticated;

-- Reports: add shop expenses for the period so the owner sees net income.
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
    'expenses', (
      select coalesce(sum(amount), 0) from public.money_movements
      where kind = 'expense' and status = 'active'
        and (moved_at at time zone 'Asia/Kolkata')::date between p_from and p_to
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
