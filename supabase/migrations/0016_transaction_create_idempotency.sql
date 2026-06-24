-- Offline transaction replay can lose the HTTP response after Supabase has
-- already committed. Store a client-generated idempotency key so retrying the
-- same queued create returns the existing transaction without applying account
-- balance impact twice.

alter table public.transactions
  add column if not exists idempotency_key text;

create unique index if not exists transactions_household_id_idempotency_key_idx
  on public.transactions (household_id, idempotency_key)
  where idempotency_key is not null;

drop function if exists public.create_finance_transaction(
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
);

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
  p_updated_at timestamptz default now(),
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_transaction public.transactions;
  inserted_transaction public.transactions;
  normalized_idempotency_key text;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  normalized_idempotency_key := nullif(btrim(p_idempotency_key), '');

  if normalized_idempotency_key is not null then
    select *
    into existing_transaction
    from public.transactions
    where household_id = p_household_id
      and idempotency_key = normalized_idempotency_key
    limit 1;

    if existing_transaction.id is not null then
      return existing_transaction;
    end if;
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
    idempotency_key,
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
    normalized_idempotency_key,
    auth.uid(),
    auth.uid(),
    p_created_at,
    p_updated_at
  )
  on conflict (household_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning *
  into inserted_transaction;

  if inserted_transaction.id is null then
    select *
    into existing_transaction
    from public.transactions
    where household_id = p_household_id
      and idempotency_key = normalized_idempotency_key
    limit 1;

    if existing_transaction.id is not null then
      return existing_transaction;
    end if;

    raise exception 'Transaction create idempotency conflict could not be resolved.';
  end if;

  perform public._apply_finance_transaction_balance_impact(
    inserted_transaction,
    false
  );

  return inserted_transaction;
end;
$$;

revoke all on function public.create_finance_transaction(
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
  timestamptz,
  text
) from public, anon;

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
  timestamptz,
  text
) to authenticated;
