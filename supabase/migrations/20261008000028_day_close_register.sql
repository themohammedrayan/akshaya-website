-- Day close becomes a balance register, independent of billing.
--
-- Not every payment gets a bill yet, so expected-vs-actual from bills would
-- show a false difference every day. Instead staff enter the balances in the
-- four places money sits - cash drawer, bank, Akshaya portal wallet ('wallet')
-- and CSC wallet ('csc') - plus UPI/GPay received today that only reaches the
-- bank tomorrow. What the shop made is worked out from how the balances moved:
--
--   takings = total(today) - total(previous close)
--             + upi_pending(today) - upi_pending(previous close)
--             + expenses + owner withdrawals
--   net     = takings - expenses
--
-- Deposits and wallet top-ups only move money between accounts, so they
-- cancel out. Govt fees paid from a wallet lower its balance, so takings is
-- roughly service income. The billed total is stored alongside, as info only.
--
-- Applied when no closes existed yet, so the old RPCs are dropped and replaced.

-- ---------------------------------------------------------------------------
-- Second wallet
-- ---------------------------------------------------------------------------
alter table public.money_movements drop constraint money_movements_from_account_check;
alter table public.money_movements drop constraint money_movements_to_account_check;
alter table public.money_movements
  add constraint money_movements_from_account_check check (from_account in ('cash', 'bank', 'wallet', 'csc')),
  add constraint money_movements_to_account_check check (to_account in ('cash', 'bank', 'wallet', 'csc'));

-- ---------------------------------------------------------------------------
-- Day closings: balances + what was made, no expected figures
-- ---------------------------------------------------------------------------
alter table public.day_closings
  add column actual_csc numeric(12, 2) not null default 0,
  add column takings numeric(12, 2),
  add column expenses numeric(12, 2),
  add column owner_took numeric(12, 2),
  add column billed_total numeric(12, 2),
  alter column expected_cash drop not null,
  alter column expected_bank drop not null,
  alter column expected_wallet drop not null;

comment on column public.day_closings.upi_pending is 'UPI/GPay/card received on close_date that reaches the bank the next day (entered by staff).';
comment on column public.day_closings.takings is 'Change in total money (incl. UPI pending) + expenses + owner withdrawals since the previous close.';
comment on column public.day_closings.billed_total is 'Bill payments received since the previous close - info only, never compared.';
comment on column public.day_closings.breakdown is 'Previous close balances and movements per kind used to work out takings.';
comment on column public.day_closings.expected_cash is 'Unused since the balance register (20261008000028).';

drop function public.day_close_expected(date);
drop function public.set_opening_balances(date, numeric, numeric, numeric);
drop function public.close_day(date, numeric, numeric, numeric);

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

create function public.set_opening_balances(
  p_date date, p_cash numeric, p_bank numeric, p_wallet numeric, p_csc numeric, p_upi_pending numeric)
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
    (close_date, is_opening, actual_cash, actual_bank, actual_wallet, actual_csc, upi_pending, note, closed_by)
  values
    (p_date, true, round(coalesce(p_cash, 0), 2), round(coalesce(p_bank, 0), 2), round(coalesce(p_wallet, 0), 2),
     round(coalesce(p_csc, 0), 2), round(coalesce(p_upi_pending, 0), 2), 'Opening balances', auth.uid());
end;
$$;

create function public.close_day(
  p_date date, p_cash numeric, p_bank numeric, p_wallet numeric, p_csc numeric, p_upi_pending numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev public.day_closings%rowtype;
  v_mov jsonb;
  v_expense numeric; v_withdrawal numeric;
  v_billed numeric;
  v_takings numeric;
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  if p_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Cannot close a future day';
  end if;
  if p_cash is null or p_bank is null or p_wallet is null or p_csc is null or p_upi_pending is null then
    raise exception 'Enter all the balances';
  end if;
  if exists (select 1 from public.day_closings where status = 'closed' and close_date >= p_date) then
    raise exception 'This day (or a later one) is already closed';
  end if;

  select * into v_prev from public.day_closings
  where status = 'closed' and close_date < p_date
  order by close_date desc limit 1;
  if not found then
    raise exception 'Opening balances have not been set yet - ask the owner';
  end if;

  select
    coalesce(sum(amount) filter (where kind = 'expense'), 0),
    coalesce(sum(amount) filter (where kind = 'withdrawal'), 0),
    jsonb_build_object(
      'expense', coalesce(sum(amount) filter (where kind = 'expense'), 0),
      'deposit', coalesce(sum(amount) filter (where kind = 'deposit'), 0),
      'withdrawal', coalesce(sum(amount) filter (where kind = 'withdrawal'), 0),
      'topup', coalesce(sum(amount) filter (where kind = 'topup'), 0)
    )
  into v_expense, v_withdrawal, v_mov
  from public.money_movements
  where status = 'active'
    and (moved_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
    and (moved_at at time zone 'Asia/Kolkata')::date <= p_date;

  -- Info only: what bills say was collected over the same days.
  select coalesce(sum(p.amount), 0) into v_billed
  from public.invoice_payments p
  join public.invoices i on i.id = p.invoice_id and i.status = 'issued'
  where (p.received_at at time zone 'Asia/Kolkata')::date > v_prev.close_date
    and (p.received_at at time zone 'Asia/Kolkata')::date <= p_date;

  v_takings :=
    (round(p_cash, 2) + round(p_bank, 2) + round(p_wallet, 2) + round(p_csc, 2) + round(p_upi_pending, 2))
    - (v_prev.actual_cash + v_prev.actual_bank + v_prev.actual_wallet + v_prev.actual_csc + v_prev.upi_pending)
    + v_expense + v_withdrawal;

  insert into public.day_closings
    (close_date, actual_cash, actual_bank, actual_wallet, actual_csc, upi_pending,
     takings, expenses, owner_took, billed_total, breakdown, closed_by)
  values
    (p_date, round(p_cash, 2), round(p_bank, 2), round(p_wallet, 2), round(p_csc, 2), round(p_upi_pending, 2),
     v_takings, v_expense, v_withdrawal, v_billed,
     jsonb_build_object(
       'previous', jsonb_build_object(
         'date', v_prev.close_date,
         'cash', v_prev.actual_cash, 'bank', v_prev.actual_bank,
         'wallet', v_prev.actual_wallet, 'csc', v_prev.actual_csc,
         'upi_pending', v_prev.upi_pending),
       'movements', v_mov),
     auth.uid());

  return public.day_close_result(p_date);
end;
$$;

-- A close as seen by whoever did it (staff can't read the table).
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
      'upi_pending', c.upi_pending,
      'previous', c.breakdown->'previous',
      'movements', c.breakdown->'movements',
      'takings', c.takings,
      'expenses', c.expenses,
      'owner_took', c.owner_took,
      'net', c.takings - c.expenses,
      'billed', c.billed_total,
      'note', c.note,
      'closed_at', c.closed_at
    )
    from public.day_closings c
    where c.close_date = p_date and c.status = 'closed' and not c.is_opening
  ) end;
$$;

-- Whether opening balances exist, the last closed date, and today's UPI/card
-- on bills (a hint for the "arrives tomorrow" field).
create or replace function public.day_close_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_staff() then null else jsonb_build_object(
    'has_opening', exists (select 1 from public.day_closings where status = 'closed'),
    'last_close_date', (select max(close_date) from public.day_closings where status = 'closed'),
    'upi_billed_today', (
      select coalesce(sum(p.amount), 0)
      from public.invoice_payments p
      join public.invoices i on i.id = p.invoice_id and i.status = 'issued'
      where p.mode in ('upi', 'card')
        and (p.received_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date)
  ) end;
$$;

revoke all on function public.set_opening_balances(date, numeric, numeric, numeric, numeric, numeric) from public, anon;
revoke all on function public.close_day(date, numeric, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.set_opening_balances(date, numeric, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.close_day(date, numeric, numeric, numeric, numeric, numeric) to authenticated;
