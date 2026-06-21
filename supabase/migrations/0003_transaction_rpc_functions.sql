-- Household Finance - balance-safe transaction RPC functions.
--
-- Transaction mutations touch both transaction rows and account balances. These
-- RPCs keep create/update/archive/soft-delete operations inside a single
-- Postgres transaction so a failed validation or balance update rolls back the
-- whole mutation. Bills, Goals, and Loans will need source-specific RPCs before
-- their cloud flows can safely create or mutate linked transactions.

create or replace function public._assert_finance_transaction_write_access(
  target_household_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  if not public.can_write_household(target_household_id) then
    raise exception 'Write access to this household is required.'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public._finance_transaction_has_linked_source(
  target_transaction public.transactions
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_transaction.linked_bill_id is not null
    or target_transaction.linked_goal_id is not null
    or target_transaction.linked_loan_id is not null
    or target_transaction.linked_source_type is not null
    or target_transaction.linked_source_id is not null;
$$;

create or replace function public._assert_active_finance_account(
  target_household_id uuid,
  target_account_id uuid,
  label text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  account_exists boolean;
begin
  if target_account_id is null then
    raise exception '% account is required.', label;
  end if;

  select exists (
    select 1
    from public.accounts account
    where account.household_id = target_household_id
      and account.id = target_account_id
      and account.archived_at is null
      and account.deleted_at is null
  )
  into account_exists;

  if not account_exists then
    raise exception '% account is not available.', label;
  end if;
end;
$$;

create or replace function public._assert_finance_category(
  target_household_id uuid,
  target_category_id uuid,
  expected_type text,
  missing_message text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actual_type text;
begin
  if target_category_id is null then
    raise exception '%', missing_message;
  end if;

  select category.type
  from public.categories category
  where category.household_id = target_household_id
    and category.id = target_category_id
    and category.archived_at is null
    and category.deleted_at is null
  into actual_type;

  if actual_type is null then
    raise exception 'Selected category is not available.';
  end if;

  if actual_type <> expected_type then
    raise exception 'Selected category must be %.', expected_type;
  end if;
end;
$$;

create or replace function public._assert_finance_transaction_input(
  target_household_id uuid,
  transaction_type text,
  transaction_amount numeric,
  transaction_date date,
  target_category_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  target_linked_goal_id uuid,
  target_linked_loan_id uuid,
  target_linked_source_type text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_linked_movement boolean;
begin
  if transaction_type not in ('income', 'expense', 'transfer', 'adjustment') then
    raise exception 'Invalid transaction type.';
  end if;

  if transaction_amount is null or transaction_amount <= 0 then
    raise exception 'Transaction amount must be greater than 0.';
  end if;

  if transaction_date is null then
    raise exception 'Transaction date is required.';
  end if;

  if transaction_type = 'income' then
    perform public._assert_finance_category(
      target_household_id,
      target_category_id,
      'income',
      'Income category is required.'
    );
    perform public._assert_active_finance_account(
      target_household_id,
      destination_account_id,
      'Destination'
    );
    return;
  end if;

  if transaction_type = 'expense' then
    perform public._assert_finance_category(
      target_household_id,
      target_category_id,
      'expense',
      'Expense category is required.'
    );
    perform public._assert_active_finance_account(
      target_household_id,
      source_account_id,
      'Source'
    );
    return;
  end if;

  if transaction_type = 'transfer' then
    is_linked_movement :=
      target_linked_goal_id is not null
      or target_linked_loan_id is not null
      or target_linked_source_type in ('goal', 'loan');

    if is_linked_movement then
      if source_account_id is null and destination_account_id is null then
        raise exception 'Linked movement account is required.';
      end if;

      if source_account_id is not null then
        perform public._assert_active_finance_account(
          target_household_id,
          source_account_id,
          'Source'
        );
      end if;

      if destination_account_id is not null then
        perform public._assert_active_finance_account(
          target_household_id,
          destination_account_id,
          'Destination'
        );
      end if;

      return;
    end if;

    perform public._assert_active_finance_account(
      target_household_id,
      source_account_id,
      'Source'
    );
    perform public._assert_active_finance_account(
      target_household_id,
      destination_account_id,
      'Destination'
    );

    if source_account_id = destination_account_id then
      raise exception 'Transfer accounts must be different.';
    end if;

    return;
  end if;

  perform public._assert_finance_category(
    target_household_id,
    target_category_id,
    'adjustment',
    'Adjustment reason is required.'
  );

  if (source_account_id is null) = (destination_account_id is null) then
    raise exception 'Adjustment must either increase or decrease one account.';
  end if;

  perform public._assert_active_finance_account(
    target_household_id,
    coalesce(destination_account_id, source_account_id),
    'Adjustment'
  );
end;
$$;

create or replace function public._apply_finance_account_delta(
  target_household_id uuid,
  target_account_id uuid,
  balance_delta numeric
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if target_account_id is null then
    raise exception 'Account is required for balance update.';
  end if;

  update public.accounts account
  set
    current_balance = account.current_balance + balance_delta,
    updated_at = now(),
    updated_by = auth.uid()
  where account.household_id = target_household_id
    and account.id = target_account_id;

  if not found then
    raise exception 'Account record was not found: %', target_account_id;
  end if;
end;
$$;

create or replace function public._apply_finance_transaction_balance_impact(
  target_transaction public.transactions,
  reverse_impact boolean default false
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  direction numeric := case when reverse_impact then -1 else 1 end;
begin
  if target_transaction.type = 'income' then
    perform public._apply_finance_account_delta(
      target_transaction.household_id,
      target_transaction.to_account_id,
      direction * target_transaction.amount
    );
    return;
  end if;

  if target_transaction.type = 'expense' then
    perform public._apply_finance_account_delta(
      target_transaction.household_id,
      target_transaction.from_account_id,
      direction * -target_transaction.amount
    );
    return;
  end if;

  if target_transaction.type = 'transfer' then
    if target_transaction.from_account_id is not null then
      perform public._apply_finance_account_delta(
        target_transaction.household_id,
        target_transaction.from_account_id,
        direction * -target_transaction.amount
      );
    end if;

    if target_transaction.to_account_id is not null then
      perform public._apply_finance_account_delta(
        target_transaction.household_id,
        target_transaction.to_account_id,
        direction * target_transaction.amount
      );
    end if;

    if target_transaction.from_account_id is null
      and target_transaction.to_account_id is null then
      raise exception 'Linked movement account is required.';
    end if;

    return;
  end if;

  if target_transaction.to_account_id is not null then
    perform public._apply_finance_account_delta(
      target_transaction.household_id,
      target_transaction.to_account_id,
      direction * target_transaction.amount
    );
    return;
  end if;

  perform public._apply_finance_account_delta(
    target_transaction.household_id,
    target_transaction.from_account_id,
    direction * -target_transaction.amount
  );
end;
$$;

create or replace function public.create_finance_transaction(
  p_household_id uuid,
  p_transaction_id uuid,
  p_type text,
  p_amount numeric,
  p_date date,
  p_time time default null,
  p_transaction_datetime timestamptz default null,
  p_category_id uuid default null,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_notes text default null,
  p_linked_bill_id uuid default null,
  p_linked_goal_id uuid default null,
  p_linked_loan_id uuid default null,
  p_linked_source_type text default null,
  p_linked_source_id uuid default null,
  p_created_at timestamptz default now(),
  p_updated_at timestamptz default now()
)
returns public.transactions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inserted_transaction public.transactions;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  perform public._assert_finance_transaction_input(
    p_household_id,
    p_type,
    p_amount,
    p_date,
    p_category_id,
    p_from_account_id,
    p_to_account_id,
    p_linked_goal_id,
    p_linked_loan_id,
    p_linked_source_type
  );

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    time,
    transaction_datetime,
    category_id,
    from_account_id,
    to_account_id,
    notes,
    linked_bill_id,
    linked_goal_id,
    linked_loan_id,
    linked_source_type,
    linked_source_id,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    p_transaction_id,
    p_household_id,
    p_type,
    p_amount,
    p_date,
    p_time,
    p_transaction_datetime,
    p_category_id,
    p_from_account_id,
    p_to_account_id,
    p_notes,
    p_linked_bill_id,
    p_linked_goal_id,
    p_linked_loan_id,
    p_linked_source_type,
    p_linked_source_id,
    auth.uid(),
    auth.uid(),
    p_created_at,
    p_updated_at
  )
  returning *
  into inserted_transaction;

  perform public._apply_finance_transaction_balance_impact(
    inserted_transaction,
    false
  );

  return inserted_transaction;
end;
$$;

create or replace function public.update_finance_transaction(
  p_household_id uuid,
  p_transaction_id uuid,
  p_type text,
  p_amount numeric,
  p_date date,
  p_time time default null,
  p_transaction_datetime timestamptz default null,
  p_category_id uuid default null,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_notes text default null,
  p_linked_bill_id uuid default null,
  p_linked_goal_id uuid default null,
  p_linked_loan_id uuid default null,
  p_linked_source_type text default null,
  p_linked_source_id uuid default null,
  p_allow_linked boolean default false,
  p_updated_at timestamptz default now()
)
returns public.transactions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_transaction public.transactions;
  updated_transaction public.transactions;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.transactions transaction
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  for update
  into existing_transaction;

  if existing_transaction.id is null then
    raise exception 'Transaction record was not found: %', p_transaction_id;
  end if;

  if not p_allow_linked
    and public._finance_transaction_has_linked_source(existing_transaction) then
    raise exception 'Linked transactions cannot be changed from the Transactions page.';
  end if;

  if not p_allow_linked and (
    p_linked_bill_id is not null
    or p_linked_goal_id is not null
    or p_linked_loan_id is not null
    or p_linked_source_type is not null
    or p_linked_source_id is not null
  ) then
    raise exception 'Linked transaction fields require a source-managed mutation.';
  end if;

  if existing_transaction.archived_at is not null
    or existing_transaction.deleted_at is not null then
    raise exception 'Archived or deleted transactions cannot be edited.';
  end if;

  perform public._assert_finance_transaction_input(
    p_household_id,
    p_type,
    p_amount,
    p_date,
    p_category_id,
    p_from_account_id,
    p_to_account_id,
    p_linked_goal_id,
    p_linked_loan_id,
    p_linked_source_type
  );

  perform public._apply_finance_transaction_balance_impact(
    existing_transaction,
    true
  );

  update public.transactions transaction
  set
    type = p_type,
    amount = p_amount,
    date = p_date,
    time = p_time,
    transaction_datetime = p_transaction_datetime,
    category_id = p_category_id,
    from_account_id = p_from_account_id,
    to_account_id = p_to_account_id,
    notes = p_notes,
    linked_bill_id = p_linked_bill_id,
    linked_goal_id = p_linked_goal_id,
    linked_loan_id = p_linked_loan_id,
    linked_source_type = p_linked_source_type,
    linked_source_id = p_linked_source_id,
    updated_by = auth.uid(),
    updated_at = p_updated_at
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  returning *
  into updated_transaction;

  perform public._apply_finance_transaction_balance_impact(
    updated_transaction,
    false
  );

  return updated_transaction;
end;
$$;

create or replace function public.archive_finance_transaction(
  p_household_id uuid,
  p_transaction_id uuid,
  p_allow_linked boolean default false,
  p_updated_at timestamptz default now()
)
returns public.transactions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_transaction public.transactions;
  updated_transaction public.transactions;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.transactions transaction
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  for update
  into existing_transaction;

  if existing_transaction.id is null then
    raise exception 'Transaction record was not found: %', p_transaction_id;
  end if;

  if not p_allow_linked
    and public._finance_transaction_has_linked_source(existing_transaction) then
    raise exception 'Linked transactions cannot be archived from the Transactions page.';
  end if;

  if existing_transaction.deleted_at is not null then
    return existing_transaction;
  end if;

  if existing_transaction.archived_at is null then
    perform public._apply_finance_transaction_balance_impact(
      existing_transaction,
      true
    );
  end if;

  update public.transactions transaction
  set
    archived_at = coalesce(transaction.archived_at, p_updated_at),
    updated_by = auth.uid(),
    updated_at = p_updated_at
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  returning *
  into updated_transaction;

  return updated_transaction;
end;
$$;

create or replace function public.delete_finance_transaction_soft(
  p_household_id uuid,
  p_transaction_id uuid,
  p_allow_linked boolean default false,
  p_updated_at timestamptz default now()
)
returns public.transactions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_transaction public.transactions;
  updated_transaction public.transactions;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.transactions transaction
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  for update
  into existing_transaction;

  if existing_transaction.id is null then
    raise exception 'Transaction record was not found: %', p_transaction_id;
  end if;

  if not p_allow_linked
    and public._finance_transaction_has_linked_source(existing_transaction) then
    raise exception 'Linked transactions cannot be deleted from the Transactions page.';
  end if;

  if existing_transaction.deleted_at is not null then
    return existing_transaction;
  end if;

  if existing_transaction.archived_at is null then
    perform public._apply_finance_transaction_balance_impact(
      existing_transaction,
      true
    );
  end if;

  update public.transactions transaction
  set
    deleted_at = p_updated_at,
    updated_by = auth.uid(),
    updated_at = p_updated_at
  where transaction.household_id = p_household_id
    and transaction.id = p_transaction_id
  returning *
  into updated_transaction;

  return updated_transaction;
end;
$$;

grant execute on function public.create_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  timestamptz,
  timestamptz
) to authenticated;

grant execute on function public.update_finance_transaction(
  uuid,
  uuid,
  text,
  numeric,
  date,
  time,
  timestamptz,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  boolean,
  timestamptz
) to authenticated;

grant execute on function public.archive_finance_transaction(
  uuid,
  uuid,
  boolean,
  timestamptz
) to authenticated;

grant execute on function public.delete_finance_transaction_soft(
  uuid,
  uuid,
  boolean,
  timestamptz
) to authenticated;
