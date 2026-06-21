-- Household Finance - balance-safe bill RPC functions.
--
-- Bill payment flows create and reverse linked expense transactions. These
-- RPCs keep bill rows, linked transactions, and account balances in one
-- database transaction so payment mutations cannot partially succeed.

create or replace function public._finance_bill_status_for_due_date(
  target_due_date date
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_due_date < current_date then 'overdue'
    when target_due_date <= current_date + 2 then 'pending'
    else 'upcoming'
  end;
$$;

create or replace function public._assert_finance_bill_input(
  target_household_id uuid,
  bill_name text,
  bill_amount numeric,
  bill_category_id uuid,
  bill_due_date date,
  bill_frequency text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(bill_name, '')), '') is null then
    raise exception 'Bill name is required.';
  end if;

  if bill_amount is null or bill_amount <= 0 then
    raise exception 'Bill amount must be greater than 0.';
  end if;

  if bill_due_date is null then
    raise exception 'Due date is required.';
  end if;

  if bill_frequency not in ('none', 'weekly', 'monthly', 'quarterly', 'yearly') then
    raise exception 'Frequency is required.';
  end if;

  perform public._assert_finance_category(
    target_household_id,
    bill_category_id,
    'expense',
    'Expense category is required.'
  );
end;
$$;

create or replace function public._reverse_finance_bill_payment(
  target_bill public.bills,
  target_updated_at timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  linked_transaction public.transactions;
begin
  if target_bill.linked_transaction_id is null then
    return;
  end if;

  select *
  from public.transactions transaction
  where transaction.household_id = target_bill.household_id
    and transaction.id = target_bill.linked_transaction_id
  for update
  into linked_transaction;

  if linked_transaction.id is null then
    return;
  end if;

  if linked_transaction.linked_bill_id is not null
    and linked_transaction.linked_bill_id <> target_bill.id then
    raise exception 'Linked bill transaction does not belong to this bill.';
  end if;

  if linked_transaction.deleted_at is not null then
    return;
  end if;

  if linked_transaction.archived_at is null then
    perform public._apply_finance_transaction_balance_impact(
      linked_transaction,
      true
    );
  end if;

  update public.transactions transaction
  set
    deleted_at = coalesce(transaction.deleted_at, target_updated_at),
    updated_at = target_updated_at,
    updated_by = auth.uid()
  where transaction.household_id = target_bill.household_id
    and transaction.id = linked_transaction.id;
end;
$$;

create or replace function public.create_finance_bill(
  p_household_id uuid,
  p_bill_id uuid,
  p_name text,
  p_amount numeric,
  p_category_id uuid,
  p_due_date date,
  p_frequency text,
  p_notes text default null,
  p_created_at timestamptz default now(),
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inserted_bill public.bills;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);
  perform public._assert_finance_bill_input(
    p_household_id,
    p_name,
    p_amount,
    p_category_id,
    p_due_date,
    p_frequency
  );

  insert into public.bills (
    id,
    household_id,
    name,
    amount,
    category_id,
    due_date,
    frequency,
    status,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    coalesce(p_bill_id, gen_random_uuid()),
    p_household_id,
    btrim(p_name),
    p_amount,
    p_category_id,
    p_due_date,
    p_frequency,
    public._finance_bill_status_for_due_date(p_due_date),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid(),
    p_created_at,
    p_updated_at
  )
  returning *
  into inserted_bill;

  return inserted_bill;
end;
$$;

create or replace function public.update_finance_bill(
  p_household_id uuid,
  p_bill_id uuid,
  p_name text,
  p_amount numeric,
  p_category_id uuid,
  p_due_date date,
  p_frequency text,
  p_notes text default null,
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_bill public.bills;
  updated_bill public.bills;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.bills bill
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  for update
  into existing_bill;

  if existing_bill.id is null then
    raise exception 'Bill record was not found: %', p_bill_id;
  end if;

  if existing_bill.archived_at is not null
    or existing_bill.deleted_at is not null then
    raise exception 'Archived or deleted bills cannot be edited.';
  end if;

  if existing_bill.status = 'paid'
    and (
      existing_bill.amount <> p_amount
      or existing_bill.category_id <> p_category_id
      or existing_bill.due_date <> p_due_date
    ) then
    raise exception 'Unmark as unpaid before editing payment details.';
  end if;

  perform public._assert_finance_bill_input(
    p_household_id,
    p_name,
    p_amount,
    p_category_id,
    p_due_date,
    p_frequency
  );

  update public.bills bill
  set
    name = btrim(p_name),
    amount = p_amount,
    category_id = p_category_id,
    due_date = p_due_date,
    frequency = p_frequency,
    status = case
      when existing_bill.status = 'paid' then 'paid'
      else public._finance_bill_status_for_due_date(p_due_date)
    end,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  returning *
  into updated_bill;

  return updated_bill;
end;
$$;

create or replace function public.mark_finance_bill_paid(
  p_household_id uuid,
  p_bill_id uuid,
  p_transaction_id uuid,
  p_payment_account_id uuid,
  p_payment_date date,
  p_notes text default null,
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_bill public.bills;
  linked_transaction public.transactions;
  updated_bill public.bills;
  normalized_notes text;
  transaction_notes text;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  if p_payment_date is null then
    raise exception 'Payment date is required.';
  end if;

  select *
  from public.bills bill
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  for update
  into existing_bill;

  if existing_bill.id is null then
    raise exception 'Bill record was not found: %', p_bill_id;
  end if;

  if existing_bill.archived_at is not null
    or existing_bill.deleted_at is not null then
    raise exception 'Archived or deleted bills cannot be paid.';
  end if;

  if existing_bill.status = 'paid' then
    raise exception 'Bill is already paid.';
  end if;

  perform public._assert_finance_category(
    p_household_id,
    existing_bill.category_id,
    'expense',
    'Expense category is required.'
  );
  perform public._assert_active_finance_account(
    p_household_id,
    p_payment_account_id,
    'Payment'
  );

  normalized_notes := coalesce(
    nullif(btrim(coalesce(p_notes, '')), ''),
    nullif(btrim(coalesce(existing_bill.notes, '')), '')
  );
  transaction_notes := case
    when normalized_notes is null then existing_bill.name
    else existing_bill.name || ': ' || normalized_notes
  end;

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    category_id,
    from_account_id,
    notes,
    linked_bill_id,
    linked_source_type,
    linked_source_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    coalesce(p_transaction_id, gen_random_uuid()),
    p_household_id,
    'expense',
    existing_bill.amount,
    p_payment_date,
    existing_bill.category_id,
    p_payment_account_id,
    transaction_notes,
    existing_bill.id,
    'bill',
    existing_bill.id,
    auth.uid(),
    auth.uid(),
    p_updated_at,
    p_updated_at
  )
  returning *
  into linked_transaction;

  perform public._apply_finance_transaction_balance_impact(
    linked_transaction,
    false
  );

  update public.bills bill
  set
    status = 'paid',
    payment_account_id = p_payment_account_id,
    linked_transaction_id = linked_transaction.id,
    paid_at = p_payment_date::timestamptz,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where bill.household_id = p_household_id
    and bill.id = existing_bill.id
  returning *
  into updated_bill;

  return updated_bill;
end;
$$;

create or replace function public.mark_finance_bill_unpaid(
  p_household_id uuid,
  p_bill_id uuid,
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_bill public.bills;
  updated_bill public.bills;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.bills bill
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  for update
  into existing_bill;

  if existing_bill.id is null then
    raise exception 'Bill record was not found: %', p_bill_id;
  end if;

  if existing_bill.status = 'paid' then
    perform public._reverse_finance_bill_payment(existing_bill, p_updated_at);
  end if;

  update public.bills bill
  set
    status = public._finance_bill_status_for_due_date(existing_bill.due_date),
    payment_account_id = null,
    linked_transaction_id = null,
    paid_at = null,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where bill.household_id = p_household_id
    and bill.id = existing_bill.id
  returning *
  into updated_bill;

  return updated_bill;
end;
$$;

create or replace function public.archive_finance_bill(
  p_household_id uuid,
  p_bill_id uuid,
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_bill public.bills;
  updated_bill public.bills;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.bills bill
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  for update
  into existing_bill;

  if existing_bill.id is null then
    raise exception 'Bill record was not found: %', p_bill_id;
  end if;

  if existing_bill.deleted_at is not null then
    return existing_bill;
  end if;

  if existing_bill.status = 'paid' then
    perform public._reverse_finance_bill_payment(existing_bill, p_updated_at);
  end if;

  update public.bills bill
  set
    status = public._finance_bill_status_for_due_date(existing_bill.due_date),
    payment_account_id = null,
    linked_transaction_id = null,
    paid_at = null,
    archived_at = coalesce(bill.archived_at, p_updated_at),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where bill.household_id = p_household_id
    and bill.id = existing_bill.id
  returning *
  into updated_bill;

  return updated_bill;
end;
$$;

create or replace function public.delete_finance_bill_soft(
  p_household_id uuid,
  p_bill_id uuid,
  p_updated_at timestamptz default now()
)
returns public.bills
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_bill public.bills;
  updated_bill public.bills;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.bills bill
  where bill.household_id = p_household_id
    and bill.id = p_bill_id
  for update
  into existing_bill;

  if existing_bill.id is null then
    raise exception 'Bill record was not found: %', p_bill_id;
  end if;

  if existing_bill.deleted_at is not null then
    return existing_bill;
  end if;

  if existing_bill.status = 'paid' then
    perform public._reverse_finance_bill_payment(existing_bill, p_updated_at);
  end if;

  update public.bills bill
  set
    status = public._finance_bill_status_for_due_date(existing_bill.due_date),
    payment_account_id = null,
    linked_transaction_id = null,
    paid_at = null,
    deleted_at = p_updated_at,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where bill.household_id = p_household_id
    and bill.id = existing_bill.id
  returning *
  into updated_bill;

  return updated_bill;
end;
$$;

revoke all on function public._finance_bill_status_for_due_date(date)
from public, anon, authenticated;

revoke all on function public._assert_finance_bill_input(
  uuid,
  text,
  numeric,
  uuid,
  date,
  text
)
from public, anon, authenticated;

revoke all on function public._reverse_finance_bill_payment(
  public.bills,
  timestamptz
)
from public, anon, authenticated;

revoke all on function public.create_finance_bill(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  date,
  text,
  text,
  timestamptz,
  timestamptz
)
from public, anon;

revoke all on function public.update_finance_bill(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  date,
  text,
  text,
  timestamptz
)
from public, anon;

revoke all on function public.mark_finance_bill_paid(
  uuid,
  uuid,
  uuid,
  uuid,
  date,
  text,
  timestamptz
)
from public, anon;

revoke all on function public.mark_finance_bill_unpaid(
  uuid,
  uuid,
  timestamptz
)
from public, anon;

revoke all on function public.archive_finance_bill(
  uuid,
  uuid,
  timestamptz
)
from public, anon;

revoke all on function public.delete_finance_bill_soft(
  uuid,
  uuid,
  timestamptz
)
from public, anon;

grant execute on function public.create_finance_bill(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  date,
  text,
  text,
  timestamptz,
  timestamptz
) to authenticated;

grant execute on function public.update_finance_bill(
  uuid,
  uuid,
  text,
  numeric,
  uuid,
  date,
  text,
  text,
  timestamptz
) to authenticated;

grant execute on function public.mark_finance_bill_paid(
  uuid,
  uuid,
  uuid,
  uuid,
  date,
  text,
  timestamptz
) to authenticated;

grant execute on function public.mark_finance_bill_unpaid(
  uuid,
  uuid,
  timestamptz
) to authenticated;

grant execute on function public.archive_finance_bill(
  uuid,
  uuid,
  timestamptz
) to authenticated;

grant execute on function public.delete_finance_bill_soft(
  uuid,
  uuid,
  timestamptz
) to authenticated;
