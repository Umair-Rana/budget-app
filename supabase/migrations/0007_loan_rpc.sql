-- Household Finance - balance-safe loan RPC functions.
--
-- Loan opening and repayment flows create source-managed linked transfer
-- transactions. These RPCs keep loan rows, linked transactions, and account
-- balances in one database transaction so movements cannot partially succeed.

create or replace function public._finance_loan_status_for_amount(
  outstanding_amount numeric,
  principal_amount numeric,
  due_date date
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when outstanding_amount <= 0 then 'completed'
    when due_date is not null and due_date < current_date then 'overdue'
    when outstanding_amount < principal_amount then 'partially_paid'
    else 'active'
  end;
$$;

create or replace function public._assert_finance_loan_input(
  loan_name text,
  loan_type text,
  principal_amount numeric,
  outstanding_amount numeric,
  interest_rate numeric,
  due_date date,
  source_account_id uuid,
  receiving_account_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(loan_name, '')), '') is null then
    raise exception 'Loan name is required.';
  end if;

  if loan_type not in ('given', 'taken') then
    raise exception 'Loan type is required.';
  end if;

  if principal_amount is null or principal_amount <= 0 then
    raise exception 'Principal amount must be greater than 0.';
  end if;

  if outstanding_amount is null or outstanding_amount < 0 then
    raise exception 'Outstanding amount cannot be negative.';
  end if;

  if outstanding_amount > principal_amount then
    raise exception 'Outstanding amount cannot exceed principal amount.';
  end if;

  if interest_rate is not null and interest_rate < 0 then
    raise exception 'Interest rate cannot be negative.';
  end if;

  if loan_type = 'given' and source_account_id is null then
    raise exception 'Loan given requires a source account.';
  end if;

  if loan_type = 'taken' and receiving_account_id is null then
    raise exception 'Loan taken requires a receiving account.';
  end if;

  -- `due_date` is typed as date; no extra format validation is needed here.
end;
$$;

create or replace function public._assert_finance_loan_can_change(
  target_loan public.loans
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_loan.archived_at is not null
    or target_loan.deleted_at is not null
    or target_loan.status = 'archived' then
    raise exception 'Archived or deleted loans cannot be changed.';
  end if;
end;
$$;

create or replace function public._finance_loan_has_active_movements(
  target_household_id uuid,
  target_loan_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.transactions transaction
    where transaction.household_id = target_household_id
      and transaction.linked_loan_id = target_loan_id
      and transaction.archived_at is null
      and transaction.deleted_at is null
  );
$$;

create or replace function public._finance_loan_movement_outstanding_delta(
  target_loan_type text,
  target_transaction public.transactions
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_transaction.linked_loan_id is null
      or target_transaction.type <> 'transfer' then 0
    when target_loan_type = 'given'
      and target_transaction.from_account_id is not null
      and target_transaction.to_account_id is null then target_transaction.amount
    when target_loan_type = 'given'
      and target_transaction.to_account_id is not null
      and target_transaction.from_account_id is null then -target_transaction.amount
    when target_loan_type = 'taken'
      and target_transaction.to_account_id is not null
      and target_transaction.from_account_id is null then target_transaction.amount
    when target_loan_type = 'taken'
      and target_transaction.from_account_id is not null
      and target_transaction.to_account_id is null then -target_transaction.amount
    else 0
  end;
$$;

create or replace function public._clamp_finance_loan_outstanding(
  target_amount numeric,
  principal_amount numeric
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(greatest(target_amount, 0), principal_amount);
$$;

create or replace function public._reverse_finance_loan_movements(
  target_loan public.loans,
  target_updated_at timestamptz
)
returns numeric
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  linked_transaction public.transactions;
  reversed_outstanding_delta numeric := 0;
begin
  for linked_transaction in
    select *
    from public.transactions transaction
    where transaction.household_id = target_loan.household_id
      and transaction.linked_loan_id = target_loan.id
      and transaction.deleted_at is null
    for update
  loop
    if linked_transaction.archived_at is null then
      perform public._apply_finance_transaction_balance_impact(
        linked_transaction,
        true
      );
      reversed_outstanding_delta :=
        reversed_outstanding_delta
        + public._finance_loan_movement_outstanding_delta(
          target_loan.type,
          linked_transaction
        );
    end if;

    update public.transactions transaction
    set
      deleted_at = coalesce(transaction.deleted_at, target_updated_at),
      updated_at = target_updated_at,
      updated_by = auth.uid()
    where transaction.household_id = target_loan.household_id
      and transaction.id = linked_transaction.id;
  end loop;

  return reversed_outstanding_delta;
end;
$$;

create or replace function public.create_finance_loan(
  p_household_id uuid,
  p_loan_id uuid,
  p_transaction_id uuid,
  p_name text,
  p_type text,
  p_counterparty text default null,
  p_principal_amount numeric default null,
  p_interest_rate numeric default null,
  p_due_date date default null,
  p_source_account_id uuid default null,
  p_receiving_account_id uuid default null,
  p_notes text default null,
  p_opened_date date default current_date,
  p_created_at timestamptz default now(),
  p_updated_at timestamptz default now()
)
returns public.loans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inserted_loan public.loans;
  linked_transaction public.transactions;
  normalized_counterparty text;
  normalized_notes text;
  party_text text := '';
  note_text text := '';
begin
  perform public._assert_finance_transaction_write_access(p_household_id);
  perform public._assert_finance_loan_input(
    p_name,
    p_type,
    p_principal_amount,
    p_principal_amount,
    p_interest_rate,
    p_due_date,
    p_source_account_id,
    p_receiving_account_id
  );

  if p_opened_date is null then
    raise exception 'Loan opening date is required.';
  end if;

  if p_type = 'given' then
    perform public._assert_active_finance_account(
      p_household_id,
      p_source_account_id,
      'Source'
    );
  else
    perform public._assert_active_finance_account(
      p_household_id,
      p_receiving_account_id,
      'Receiving'
    );
  end if;

  normalized_counterparty := nullif(btrim(coalesce(p_counterparty, '')), '');
  normalized_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if normalized_counterparty is not null then
    party_text := ' with ' || normalized_counterparty;
  end if;

  if normalized_notes is not null then
    note_text := ': ' || normalized_notes;
  end if;

  insert into public.loans (
    id,
    household_id,
    name,
    type,
    counterparty,
    principal_amount,
    outstanding_amount,
    interest_rate,
    due_date,
    status,
    source_account_id,
    receiving_account_id,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    coalesce(p_loan_id, gen_random_uuid()),
    p_household_id,
    btrim(p_name),
    p_type,
    normalized_counterparty,
    p_principal_amount,
    p_principal_amount,
    p_interest_rate,
    p_due_date,
    public._finance_loan_status_for_amount(
      p_principal_amount,
      p_principal_amount,
      p_due_date
    ),
    case when p_type = 'given' then p_source_account_id else null end,
    case when p_type = 'taken' then p_receiving_account_id else null end,
    normalized_notes,
    auth.uid(),
    auth.uid(),
    p_created_at,
    p_updated_at
  )
  returning *
  into inserted_loan;

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    from_account_id,
    to_account_id,
    notes,
    linked_loan_id,
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
    'transfer',
    p_principal_amount,
    p_opened_date,
    case when p_type = 'given' then p_source_account_id else null end,
    case when p_type = 'taken' then p_receiving_account_id else null end,
    case
      when p_type = 'given'
        then 'Loan given' || party_text || ' - ' || btrim(p_name) || note_text
      else 'Loan taken' || party_text || ' - ' || btrim(p_name) || note_text
    end,
    inserted_loan.id,
    'loan',
    inserted_loan.id,
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

  update public.loans loan
  set
    linked_transaction_id = linked_transaction.id,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where loan.household_id = p_household_id
    and loan.id = inserted_loan.id
  returning *
  into inserted_loan;

  return inserted_loan;
end;
$$;

create or replace function public.update_finance_loan(
  p_household_id uuid,
  p_loan_id uuid,
  p_name text,
  p_type text,
  p_counterparty text default null,
  p_principal_amount numeric default null,
  p_interest_rate numeric default null,
  p_due_date date default null,
  p_source_account_id uuid default null,
  p_receiving_account_id uuid default null,
  p_notes text default null,
  p_updated_at timestamptz default now()
)
returns public.loans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_loan public.loans;
  updated_loan public.loans;
  next_outstanding_amount numeric;
  has_financial_detail_change boolean;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.loans loan
  where loan.household_id = p_household_id
    and loan.id = p_loan_id
  for update
  into existing_loan;

  if existing_loan.id is null then
    raise exception 'Loan record was not found: %', p_loan_id;
  end if;

  perform public._assert_finance_loan_can_change(existing_loan);

  has_financial_detail_change :=
    p_type <> existing_loan.type
    or p_principal_amount <> existing_loan.principal_amount
    or coalesce(p_source_account_id, '00000000-0000-0000-0000-000000000000'::uuid)
      <> coalesce(
        existing_loan.source_account_id,
        '00000000-0000-0000-0000-000000000000'::uuid
      )
    or coalesce(
      p_receiving_account_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ) <> coalesce(
      existing_loan.receiving_account_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    );

  if has_financial_detail_change
    and public._finance_loan_has_active_movements(p_household_id, p_loan_id) then
    raise exception 'This loan has linked movements. Reverse or delete linked movements before editing financial details.';
  end if;

  next_outstanding_amount := case
    when p_principal_amount <> existing_loan.principal_amount
      then p_principal_amount
    else existing_loan.outstanding_amount
  end;

  perform public._assert_finance_loan_input(
    p_name,
    p_type,
    p_principal_amount,
    next_outstanding_amount,
    p_interest_rate,
    p_due_date,
    p_source_account_id,
    p_receiving_account_id
  );

  if p_type = 'given' then
    perform public._assert_active_finance_account(
      p_household_id,
      p_source_account_id,
      'Source'
    );
  else
    perform public._assert_active_finance_account(
      p_household_id,
      p_receiving_account_id,
      'Receiving'
    );
  end if;

  update public.loans loan
  set
    name = btrim(p_name),
    type = p_type,
    counterparty = nullif(btrim(coalesce(p_counterparty, '')), ''),
    principal_amount = p_principal_amount,
    outstanding_amount = next_outstanding_amount,
    interest_rate = p_interest_rate,
    due_date = p_due_date,
    status = public._finance_loan_status_for_amount(
      next_outstanding_amount,
      p_principal_amount,
      p_due_date
    ),
    source_account_id = case when p_type = 'given' then p_source_account_id else null end,
    receiving_account_id = case
      when p_type = 'taken' then p_receiving_account_id
      else null
    end,
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where loan.household_id = p_household_id
    and loan.id = p_loan_id
  returning *
  into updated_loan;

  return updated_loan;
end;
$$;

create or replace function public.record_finance_loan_payment(
  p_household_id uuid,
  p_loan_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_account_id uuid,
  p_date date,
  p_notes text default null,
  p_updated_at timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_loan public.loans;
  linked_transaction public.transactions;
  updated_loan public.loans;
  normalized_notes text;
  note_text text := '';
  next_outstanding_amount numeric;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  if p_amount is null or p_amount <= 0 then
    raise exception 'Repayment amount must be greater than 0.';
  end if;

  if p_date is null then
    raise exception 'Repayment date is required.';
  end if;

  select *
  from public.loans loan
  where loan.household_id = p_household_id
    and loan.id = p_loan_id
  for update
  into existing_loan;

  if existing_loan.id is null then
    raise exception 'Loan record was not found: %', p_loan_id;
  end if;

  perform public._assert_finance_loan_can_change(existing_loan);

  if existing_loan.outstanding_amount <= 0 then
    raise exception 'Loan is already completed.';
  end if;

  if p_amount > existing_loan.outstanding_amount then
    raise exception 'Repayment cannot exceed outstanding amount.';
  end if;

  if p_account_id is null then
    raise exception 'Payment account is required.';
  end if;

  perform public._assert_active_finance_account(
    p_household_id,
    p_account_id,
    case when existing_loan.type = 'given' then 'Receiving' else 'Payment' end
  );

  normalized_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if normalized_notes is not null then
    note_text := ': ' || normalized_notes;
  end if;

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    from_account_id,
    to_account_id,
    notes,
    linked_loan_id,
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
    'transfer',
    p_amount,
    p_date,
    case when existing_loan.type = 'taken' then p_account_id else null end,
    case when existing_loan.type = 'given' then p_account_id else null end,
    case
      when existing_loan.type = 'given'
        then 'Loan repayment received - ' || existing_loan.name || note_text
      else 'Loan repayment made - ' || existing_loan.name || note_text
    end,
    existing_loan.id,
    'loan',
    existing_loan.id,
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

  next_outstanding_amount := existing_loan.outstanding_amount - p_amount;

  update public.loans loan
  set
    outstanding_amount = next_outstanding_amount,
    status = public._finance_loan_status_for_amount(
      next_outstanding_amount,
      loan.principal_amount,
      loan.due_date
    ),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where loan.household_id = p_household_id
    and loan.id = existing_loan.id
  returning *
  into updated_loan;

  return jsonb_build_object(
    'loan',
    to_jsonb(updated_loan),
    'transaction',
    to_jsonb(linked_transaction)
  );
end;
$$;

create or replace function public.archive_finance_loan(
  p_household_id uuid,
  p_loan_id uuid,
  p_updated_at timestamptz default now()
)
returns public.loans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_loan public.loans;
  updated_loan public.loans;
  reversed_outstanding_delta numeric := 0;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.loans loan
  where loan.household_id = p_household_id
    and loan.id = p_loan_id
  for update
  into existing_loan;

  if existing_loan.id is null then
    raise exception 'Loan record was not found: %', p_loan_id;
  end if;

  if existing_loan.deleted_at is not null then
    return existing_loan;
  end if;

  reversed_outstanding_delta :=
    public._reverse_finance_loan_movements(existing_loan, p_updated_at);

  update public.loans loan
  set
    outstanding_amount = public._clamp_finance_loan_outstanding(
      loan.outstanding_amount - reversed_outstanding_delta,
      loan.principal_amount
    ),
    status = 'archived',
    archived_at = coalesce(loan.archived_at, p_updated_at),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where loan.household_id = p_household_id
    and loan.id = existing_loan.id
  returning *
  into updated_loan;

  return updated_loan;
end;
$$;

create or replace function public.delete_finance_loan_soft(
  p_household_id uuid,
  p_loan_id uuid,
  p_updated_at timestamptz default now()
)
returns public.loans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_loan public.loans;
  updated_loan public.loans;
  reversed_outstanding_delta numeric := 0;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.loans loan
  where loan.household_id = p_household_id
    and loan.id = p_loan_id
  for update
  into existing_loan;

  if existing_loan.id is null then
    raise exception 'Loan record was not found: %', p_loan_id;
  end if;

  if existing_loan.deleted_at is not null then
    return existing_loan;
  end if;

  reversed_outstanding_delta :=
    public._reverse_finance_loan_movements(existing_loan, p_updated_at);

  update public.loans loan
  set
    outstanding_amount = public._clamp_finance_loan_outstanding(
      loan.outstanding_amount - reversed_outstanding_delta,
      loan.principal_amount
    ),
    status = 'archived',
    deleted_at = p_updated_at,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where loan.household_id = p_household_id
    and loan.id = existing_loan.id
  returning *
  into updated_loan;

  return updated_loan;
end;
$$;

revoke all on function public._finance_loan_status_for_amount(
  numeric,
  numeric,
  date
) from public, anon, authenticated;

revoke all on function public._assert_finance_loan_input(
  text,
  text,
  numeric,
  numeric,
  numeric,
  date,
  uuid,
  uuid
) from public, anon, authenticated;

revoke all on function public._assert_finance_loan_can_change(public.loans)
from public, anon, authenticated;

revoke all on function public._finance_loan_has_active_movements(uuid, uuid)
from public, anon, authenticated;

revoke all on function public._finance_loan_movement_outstanding_delta(
  text,
  public.transactions
) from public, anon, authenticated;

revoke all on function public._clamp_finance_loan_outstanding(numeric, numeric)
from public, anon, authenticated;

revoke all on function public._reverse_finance_loan_movements(
  public.loans,
  timestamptz
) from public, anon, authenticated;

revoke all on function public.create_finance_loan(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  date,
  uuid,
  uuid,
  text,
  date,
  timestamptz,
  timestamptz
) from public, anon;

revoke all on function public.update_finance_loan(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  date,
  uuid,
  uuid,
  text,
  timestamptz
) from public, anon;

revoke all on function public.record_finance_loan_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
) from public, anon;

revoke all on function public.archive_finance_loan(uuid, uuid, timestamptz)
from public, anon;

revoke all on function public.delete_finance_loan_soft(uuid, uuid, timestamptz)
from public, anon;

grant execute on function public.create_finance_loan(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  date,
  uuid,
  uuid,
  text,
  date,
  timestamptz,
  timestamptz
) to authenticated;

grant execute on function public.update_finance_loan(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  date,
  uuid,
  uuid,
  text,
  timestamptz
) to authenticated;

grant execute on function public.record_finance_loan_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
) to authenticated;

grant execute on function public.archive_finance_loan(uuid, uuid, timestamptz)
to authenticated;

grant execute on function public.delete_finance_loan_soft(
  uuid,
  uuid,
  timestamptz
) to authenticated;
