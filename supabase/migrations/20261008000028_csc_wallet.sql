-- Day close: a second wallet. Centers pay govt fees from the Akshaya / e-District
-- portal wallet ('wallet') and from the CSC Digital Seva wallet ('csc'); each
-- is counted and reconciled separately.
--
-- Changes the close/opening RPCs to take a CSC balance (5 args). Applied when
-- no closes existed yet, so the old 4-arg versions are dropped.

alter table public.services drop constraint services_govt_paid_from_check;
alter table public.services
  add constraint services_govt_paid_from_check check (govt_paid_from in ('bank', 'wallet', 'csc'));

comment on column public.services.govt_paid_from is 'Where the center pays this service''s govt fee from: bank, Akshaya portal wallet (wallet) or CSC wallet (csc). Drives expected balances in the daily close.';

alter table public.money_movements drop constraint money_movements_from_account_check;
alter table public.money_movements drop constraint money_movements_to_account_check;
alter table public.money_movements
  add constraint money_movements_from_account_check check (from_account in ('cash', 'bank', 'wallet', 'csc')),
  add constraint money_movements_to_account_check check (to_account in ('cash', 'bank', 'wallet', 'csc'));

alter table public.day_closings
  add column actual_csc numeric(12, 2) not null default 0,
  add column expected_csc numeric(12, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- Expected balances for p_date, from the latest close before it
-- ---------------------------------------------------------------------------
create or replace function public.day_close_expected(p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prev public.day_closings%rowtype;
  v_cash_in numeric; v_upi_in numeric; v_upi_pending numeric;
  v_govt_bank numeric; v_govt_wallet numeric; v_govt_csc numeric;
  v_mov jsonb;
  v_out_cash numeric; v_out_bank numeric; v_out_wallet numeric; v_out_csc numeric;
  v_in_cash numeric; v_in_bank numeric; v_in_wallet numeric; v_in_csc numeric;
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
    coalesce(sum(it.qty * it.govt_fee) filter (where s.govt_paid_from = 'wallet'), 0),
    coalesce(sum(it.qty * it.govt_fee) filter (where s.govt_paid_from = 'csc'), 0)
  into v_govt_bank, v_govt_wallet, v_govt_csc
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
    coalesce(sum(amount) filter (where from_account = 'csc'), 0),
    coalesce(sum(amount) filter (where to_account = 'cash'), 0),
    coalesce(sum(amount) filter (where to_account = 'bank'), 0),
    coalesce(sum(amount) filter (where to_account = 'wallet'), 0),
    coalesce(sum(amount) filter (where to_account = 'csc'), 0),
    jsonb_build_object(
      'expense', coalesce(sum(amount) filter (where kind = 'expense'), 0),
      'deposit', coalesce(sum(amount) filter (where kind = 'deposit'), 0),
      'withdrawal', coalesce(sum(amount) filter (where kind = 'withdrawal'), 0),
      'topup', coalesce(sum(amount) filter (where kind = 'topup'), 0)
    )
  into v_out_cash, v_out_bank, v_out_wallet, v_out_csc, v_in_cash, v_in_bank, v_in_wallet, v_in_csc, v_mov
  from public.money_movements
  where status = 'active'
    and (moved_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
    and (moved_at at time zone 'Asia/Kolkata')::date <= p_date;

  return jsonb_build_object(
    'since', v_prev.close_date,
    'opening', jsonb_build_object('cash', v_prev.actual_cash, 'bank', v_prev.actual_bank,
      'wallet', v_prev.actual_wallet, 'csc', v_prev.actual_csc),
    'expected_cash', v_prev.actual_cash + v_cash_in - v_out_cash + v_in_cash,
    'expected_bank', v_prev.actual_bank + v_upi_in - v_govt_bank - v_out_bank + v_in_bank,
    'expected_wallet', v_prev.actual_wallet - v_govt_wallet - v_out_wallet + v_in_wallet,
    'expected_csc', v_prev.actual_csc - v_govt_csc - v_out_csc + v_in_csc,
    'upi_pending', v_upi_pending,
    'breakdown', jsonb_build_object(
      'cash_received', v_cash_in,
      'upi_card_settled', v_upi_in,
      'govt_fees_bank', v_govt_bank,
      'govt_fees_wallet', v_govt_wallet,
      'govt_fees_csc', v_govt_csc,
      'movements', v_mov
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.add_money_movement(p_kind text, p_from text, p_to text, p_amount numeric, p_note text)
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
     or (p_kind = 'topup' and (p_from not in ('cash', 'bank') or p_to is null or p_to not in ('wallet', 'csc'))) then
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

drop function public.set_opening_balances(date, numeric, numeric, numeric);
drop function public.close_day(date, numeric, numeric, numeric);

create function public.set_opening_balances(p_date date, p_cash numeric, p_bank numeric, p_wallet numeric, p_csc numeric)
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
    (close_date, is_opening, actual_cash, actual_bank, actual_wallet, actual_csc,
     expected_cash, expected_bank, expected_wallet, expected_csc, note, closed_by)
  values
    (p_date, true, coalesce(p_cash, 0), coalesce(p_bank, 0), coalesce(p_wallet, 0), coalesce(p_csc, 0),
     coalesce(p_cash, 0), coalesce(p_bank, 0), coalesce(p_wallet, 0), coalesce(p_csc, 0), 'Opening balances', auth.uid());
end;
$$;

-- Saves the close and only then returns expected vs actual (blind count).
create function public.close_day(p_date date, p_cash numeric, p_bank numeric, p_wallet numeric, p_csc numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  if p_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Cannot close a future day';
  end if;
  if p_cash is null or p_bank is null or p_wallet is null or p_csc is null then
    raise exception 'Enter all four balances';
  end if;
  if exists (select 1 from public.day_closings where status = 'closed' and close_date >= p_date) then
    raise exception 'This day (or a later one) is already closed';
  end if;

  v_exp := public.day_close_expected(p_date);
  if v_exp is null then
    raise exception 'Opening balances have not been set yet - ask the owner';
  end if;

  insert into public.day_closings
    (close_date, actual_cash, actual_bank, actual_wallet, actual_csc,
     expected_cash, expected_bank, expected_wallet, expected_csc,
     upi_pending, breakdown, closed_by)
  values
    (p_date, round(p_cash, 2), round(p_bank, 2), round(p_wallet, 2), round(p_csc, 2),
     (v_exp->>'expected_cash')::numeric, (v_exp->>'expected_bank')::numeric,
     (v_exp->>'expected_wallet')::numeric, (v_exp->>'expected_csc')::numeric,
     (v_exp->>'upi_pending')::numeric, v_exp->'breakdown', auth.uid());

  return public.day_close_result(p_date);
end;
$$;

create or replace function public.day_close_result(p_date date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_staff() then null else (
    select jsonb_build_object(
      'close_date', c.close_date,
      'actual', jsonb_build_object('cash', c.actual_cash, 'bank', c.actual_bank,
        'wallet', c.actual_wallet, 'csc', c.actual_csc),
      'expected', jsonb_build_object('cash', c.expected_cash, 'bank', c.expected_bank,
        'wallet', c.expected_wallet, 'csc', c.expected_csc),
      'difference', jsonb_build_object(
        'cash', c.actual_cash - c.expected_cash,
        'bank', c.actual_bank - c.expected_bank,
        'wallet', c.actual_wallet - c.expected_wallet,
        'csc', c.actual_csc - c.expected_csc),
      'upi_pending', c.upi_pending,
      'breakdown', c.breakdown,
      'note', c.note,
      'closed_at', c.closed_at
    )
    from public.day_closings c
    where c.close_date = p_date and c.status = 'closed' and not c.is_opening
  ) end;
$$;

revoke all on function public.set_opening_balances(date, numeric, numeric, numeric, numeric) from public, anon;
revoke all on function public.close_day(date, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.set_opening_balances(date, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.close_day(date, numeric, numeric, numeric, numeric) to authenticated;
