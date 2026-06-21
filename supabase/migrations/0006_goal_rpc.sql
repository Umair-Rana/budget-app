-- Household Finance - balance-safe goal RPC functions.
--
-- Goal movement flows create source-managed linked transfer transactions.
-- These RPCs keep goal rows, linked transactions, and account balances in one
-- database transaction so movements cannot partially succeed.

create or replace function public._finance_goal_status_for_amount(
  current_amount numeric,
  target_amount numeric
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when current_amount >= target_amount then 'completed'
    else 'active'
  end;
$$;

create or replace function public._clamp_finance_amount(
  target_amount numeric,
  minimum_amount numeric,
  maximum_amount numeric
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(greatest(target_amount, minimum_amount), maximum_amount);
$$;

create or replace function public._assert_finance_goal_input(
  goal_name text,
  target_amount numeric,
  current_amount numeric,
  target_date date,
  goal_priority text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(goal_name, '')), '') is null then
    raise exception 'Goal name is required.';
  end if;

  if target_amount is null or target_amount <= 0 then
    raise exception 'Target amount must be greater than 0.';
  end if;

  if current_amount is null or current_amount < 0 then
    raise exception 'Current amount cannot be negative.';
  end if;

  if current_amount > target_amount then
    raise exception 'Current amount cannot exceed target amount.';
  end if;

  if goal_priority not in ('low', 'medium', 'high') then
    raise exception 'Priority is required.';
  end if;

  -- `target_date` is typed as date; no extra format validation is needed here.
end;
$$;

create or replace function public._assert_finance_goal_can_change(
  target_goal public.goals
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_goal.archived_at is not null
    or target_goal.deleted_at is not null
    or target_goal.status = 'archived' then
    raise exception 'Archived or deleted goals cannot be changed.';
  end if;
end;
$$;

create or replace function public._finance_goal_has_active_movements(
  target_household_id uuid,
  target_goal_id uuid
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
      and transaction.linked_goal_id = target_goal_id
      and transaction.archived_at is null
      and transaction.deleted_at is null
  );
$$;

create or replace function public._finance_goal_movement_delta(
  target_transaction public.transactions
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_transaction.linked_goal_id is null
      or target_transaction.type <> 'transfer' then 0
    when target_transaction.from_account_id is not null
      and target_transaction.to_account_id is null then target_transaction.amount
    when target_transaction.to_account_id is not null
      and target_transaction.from_account_id is null then -target_transaction.amount
    else 0
  end;
$$;

create or replace function public._reverse_finance_goal_movements(
  target_goal public.goals,
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
  reversed_goal_delta numeric := 0;
begin
  for linked_transaction in
    select *
    from public.transactions transaction
    where transaction.household_id = target_goal.household_id
      and transaction.linked_goal_id = target_goal.id
      and transaction.deleted_at is null
    for update
  loop
    if linked_transaction.archived_at is null then
      perform public._apply_finance_transaction_balance_impact(
        linked_transaction,
        true
      );
      reversed_goal_delta :=
        reversed_goal_delta
        + public._finance_goal_movement_delta(linked_transaction);
    end if;

    update public.transactions transaction
    set
      deleted_at = coalesce(transaction.deleted_at, target_updated_at),
      updated_at = target_updated_at,
      updated_by = auth.uid()
    where transaction.household_id = target_goal.household_id
      and transaction.id = linked_transaction.id;
  end loop;

  return reversed_goal_delta;
end;
$$;

create or replace function public.create_finance_goal(
  p_household_id uuid,
  p_goal_id uuid,
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date default null,
  p_priority text default 'medium',
  p_icon text default null,
  p_color text default null,
  p_notes text default null,
  p_created_at timestamptz default now(),
  p_updated_at timestamptz default now()
)
returns public.goals
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  inserted_goal public.goals;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);
  perform public._assert_finance_goal_input(
    p_name,
    p_target_amount,
    p_current_amount,
    p_target_date,
    p_priority
  );

  insert into public.goals (
    id,
    household_id,
    name,
    target_amount,
    current_amount,
    target_date,
    priority,
    status,
    icon,
    color,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    coalesce(p_goal_id, gen_random_uuid()),
    p_household_id,
    btrim(p_name),
    p_target_amount,
    p_current_amount,
    p_target_date,
    p_priority,
    public._finance_goal_status_for_amount(
      p_current_amount,
      p_target_amount
    ),
    nullif(btrim(coalesce(p_icon, '')), ''),
    nullif(btrim(coalesce(p_color, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid(),
    p_created_at,
    p_updated_at
  )
  returning *
  into inserted_goal;

  return inserted_goal;
end;
$$;

create or replace function public.update_finance_goal(
  p_household_id uuid,
  p_goal_id uuid,
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date default null,
  p_priority text default 'medium',
  p_icon text default null,
  p_color text default null,
  p_notes text default null,
  p_updated_at timestamptz default now()
)
returns public.goals
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_goal public.goals;
  updated_goal public.goals;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.goals goal
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  for update
  into existing_goal;

  if existing_goal.id is null then
    raise exception 'Goal record was not found: %', p_goal_id;
  end if;

  perform public._assert_finance_goal_can_change(existing_goal);

  if p_current_amount <> existing_goal.current_amount
    and public._finance_goal_has_active_movements(p_household_id, p_goal_id) then
    raise exception 'Current amount is controlled by linked goal movements.';
  end if;

  perform public._assert_finance_goal_input(
    p_name,
    p_target_amount,
    p_current_amount,
    p_target_date,
    p_priority
  );

  update public.goals goal
  set
    name = btrim(p_name),
    target_amount = p_target_amount,
    current_amount = p_current_amount,
    target_date = p_target_date,
    priority = p_priority,
    status = public._finance_goal_status_for_amount(
      p_current_amount,
      p_target_amount
    ),
    icon = nullif(btrim(coalesce(p_icon, '')), ''),
    color = nullif(btrim(coalesce(p_color, '')), ''),
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  returning *
  into updated_goal;

  return updated_goal;
end;
$$;

create or replace function public.goal_contribute(
  p_household_id uuid,
  p_goal_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_source_account_id uuid,
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
  existing_goal public.goals;
  linked_transaction public.transactions;
  updated_goal public.goals;
  normalized_notes text;
  transaction_notes text;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  if p_amount is null or p_amount <= 0 then
    raise exception 'Contribution amount must be greater than 0.';
  end if;

  if p_date is null then
    raise exception 'Contribution date is required.';
  end if;

  select *
  from public.goals goal
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  for update
  into existing_goal;

  if existing_goal.id is null then
    raise exception 'Goal record was not found: %', p_goal_id;
  end if;

  perform public._assert_finance_goal_can_change(existing_goal);

  if existing_goal.current_amount + p_amount > existing_goal.target_amount then
    raise exception 'Contribution cannot exceed the goal target.';
  end if;

  perform public._assert_active_finance_account(
    p_household_id,
    p_source_account_id,
    'Source'
  );

  normalized_notes := nullif(btrim(coalesce(p_notes, '')), '');
  transaction_notes := case
    when normalized_notes is null
      then 'Goal contribution to ' || existing_goal.name
    else 'Goal contribution to ' || existing_goal.name || ': ' || normalized_notes
  end;

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    from_account_id,
    notes,
    linked_goal_id,
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
    p_source_account_id,
    transaction_notes,
    existing_goal.id,
    'goal',
    existing_goal.id,
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

  update public.goals goal
  set
    current_amount = goal.current_amount + p_amount,
    status = public._finance_goal_status_for_amount(
      goal.current_amount + p_amount,
      goal.target_amount
    ),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where goal.household_id = p_household_id
    and goal.id = existing_goal.id
  returning *
  into updated_goal;

  return jsonb_build_object(
    'goal',
    to_jsonb(updated_goal),
    'transaction',
    to_jsonb(linked_transaction)
  );
end;
$$;

create or replace function public.goal_withdraw(
  p_household_id uuid,
  p_goal_id uuid,
  p_transaction_id uuid,
  p_amount numeric,
  p_destination_account_id uuid,
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
  existing_goal public.goals;
  linked_transaction public.transactions;
  updated_goal public.goals;
  normalized_notes text;
  transaction_notes text;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than 0.';
  end if;

  if p_date is null then
    raise exception 'Withdrawal date is required.';
  end if;

  select *
  from public.goals goal
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  for update
  into existing_goal;

  if existing_goal.id is null then
    raise exception 'Goal record was not found: %', p_goal_id;
  end if;

  perform public._assert_finance_goal_can_change(existing_goal);

  if p_amount > existing_goal.current_amount then
    raise exception 'Withdrawal cannot exceed the saved goal amount.';
  end if;

  perform public._assert_active_finance_account(
    p_household_id,
    p_destination_account_id,
    'Destination'
  );

  normalized_notes := nullif(btrim(coalesce(p_notes, '')), '');
  transaction_notes := case
    when normalized_notes is null
      then 'Goal withdrawal from ' || existing_goal.name
    else 'Goal withdrawal from ' || existing_goal.name || ': ' || normalized_notes
  end;

  insert into public.transactions (
    id,
    household_id,
    type,
    amount,
    date,
    to_account_id,
    notes,
    linked_goal_id,
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
    p_destination_account_id,
    transaction_notes,
    existing_goal.id,
    'goal',
    existing_goal.id,
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

  update public.goals goal
  set
    current_amount = goal.current_amount - p_amount,
    status = public._finance_goal_status_for_amount(
      goal.current_amount - p_amount,
      goal.target_amount
    ),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where goal.household_id = p_household_id
    and goal.id = existing_goal.id
  returning *
  into updated_goal;

  return jsonb_build_object(
    'goal',
    to_jsonb(updated_goal),
    'transaction',
    to_jsonb(linked_transaction)
  );
end;
$$;

create or replace function public.archive_finance_goal(
  p_household_id uuid,
  p_goal_id uuid,
  p_updated_at timestamptz default now()
)
returns public.goals
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_goal public.goals;
  updated_goal public.goals;
  reversed_goal_delta numeric := 0;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.goals goal
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  for update
  into existing_goal;

  if existing_goal.id is null then
    raise exception 'Goal record was not found: %', p_goal_id;
  end if;

  if existing_goal.deleted_at is not null then
    return existing_goal;
  end if;

  reversed_goal_delta :=
    public._reverse_finance_goal_movements(existing_goal, p_updated_at);

  update public.goals goal
  set
    current_amount = public._clamp_finance_amount(
      goal.current_amount - reversed_goal_delta,
      0,
      goal.target_amount
    ),
    status = 'archived',
    archived_at = coalesce(goal.archived_at, p_updated_at),
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where goal.household_id = p_household_id
    and goal.id = existing_goal.id
  returning *
  into updated_goal;

  return updated_goal;
end;
$$;

create or replace function public.delete_finance_goal_soft(
  p_household_id uuid,
  p_goal_id uuid,
  p_updated_at timestamptz default now()
)
returns public.goals
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  existing_goal public.goals;
  updated_goal public.goals;
  reversed_goal_delta numeric := 0;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  select *
  from public.goals goal
  where goal.household_id = p_household_id
    and goal.id = p_goal_id
  for update
  into existing_goal;

  if existing_goal.id is null then
    raise exception 'Goal record was not found: %', p_goal_id;
  end if;

  if existing_goal.deleted_at is not null then
    return existing_goal;
  end if;

  reversed_goal_delta :=
    public._reverse_finance_goal_movements(existing_goal, p_updated_at);

  update public.goals goal
  set
    current_amount = public._clamp_finance_amount(
      goal.current_amount - reversed_goal_delta,
      0,
      goal.target_amount
    ),
    status = 'archived',
    deleted_at = p_updated_at,
    updated_at = p_updated_at,
    updated_by = auth.uid()
  where goal.household_id = p_household_id
    and goal.id = existing_goal.id
  returning *
  into updated_goal;

  return updated_goal;
end;
$$;

revoke all on function public._finance_goal_status_for_amount(numeric, numeric)
from public, anon, authenticated;

revoke all on function public._clamp_finance_amount(numeric, numeric, numeric)
from public, anon, authenticated;

revoke all on function public._assert_finance_goal_input(
  text,
  numeric,
  numeric,
  date,
  text
)
from public, anon, authenticated;

revoke all on function public._assert_finance_goal_can_change(public.goals)
from public, anon, authenticated;

revoke all on function public._finance_goal_has_active_movements(uuid, uuid)
from public, anon, authenticated;

revoke all on function public._finance_goal_movement_delta(public.transactions)
from public, anon, authenticated;

revoke all on function public._reverse_finance_goal_movements(
  public.goals,
  timestamptz
)
from public, anon, authenticated;

revoke all on function public.create_finance_goal(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
)
from public, anon;

revoke all on function public.update_finance_goal(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  timestamptz
)
from public, anon;

revoke all on function public.goal_contribute(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
)
from public, anon;

revoke all on function public.goal_withdraw(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
)
from public, anon;

revoke all on function public.archive_finance_goal(uuid, uuid, timestamptz)
from public, anon;

revoke all on function public.delete_finance_goal_soft(uuid, uuid, timestamptz)
from public, anon;

grant execute on function public.create_finance_goal(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to authenticated;

grant execute on function public.update_finance_goal(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  date,
  text,
  text,
  text,
  text,
  timestamptz
) to authenticated;

grant execute on function public.goal_contribute(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
) to authenticated;

grant execute on function public.goal_withdraw(
  uuid,
  uuid,
  uuid,
  numeric,
  uuid,
  date,
  text,
  timestamptz
) to authenticated;

grant execute on function public.archive_finance_goal(uuid, uuid, timestamptz)
to authenticated;

grant execute on function public.delete_finance_goal_soft(
  uuid,
  uuid,
  timestamptz
) to authenticated;
