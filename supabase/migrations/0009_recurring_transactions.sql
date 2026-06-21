-- Household Finance - recurring transaction rules.
-- Manual generation creates normal transactions through the existing
-- balance-safe transaction RPC; this table stores the repeat schedule only.

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  name text not null check (length(trim(name)) > 0),
  amount numeric not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  frequency text not null check (
    frequency in ('daily', 'weekly', 'monthly', 'yearly')
  ),
  interval integer not null default 1 check (interval >= 1),
  start_date date not null,
  next_run_date date not null,
  end_date date,
  is_active boolean not null default true,
  notes text,
  last_generated_at timestamptz,
  last_generated_for_date date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  check (next_run_date >= start_date),
  check (end_date is null or end_date >= start_date),
  check (
    (type = 'income' and category_id is not null and to_account_id is not null)
    or (
      type = 'expense'
      and category_id is not null
      and from_account_id is not null
    )
    or (
      type = 'transfer'
      and from_account_id is not null
      and to_account_id is not null
      and from_account_id <> to_account_id
    )
  )
);

create index recurring_transactions_household_id_idx
  on public.recurring_transactions (household_id);

create index recurring_transactions_household_deleted_at_idx
  on public.recurring_transactions (household_id, deleted_at);

create index recurring_transactions_household_next_run_idx
  on public.recurring_transactions (household_id, next_run_date);

create index recurring_transactions_household_due_active_idx
  on public.recurring_transactions (household_id, next_run_date)
  where is_active = true and archived_at is null and deleted_at is null;

create index recurring_transactions_household_type_idx
  on public.recurring_transactions (household_id, type);

create unique index recurring_transactions_last_generated_unique_idx
  on public.recurring_transactions (household_id, id, last_generated_for_date)
  where last_generated_for_date is not null;

drop trigger if exists recurring_transactions_set_updated_at
  on public.recurring_transactions;
create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row execute function public.set_updated_at();

alter table public.recurring_transactions enable row level security;

drop policy if exists recurring_transactions_select_members
  on public.recurring_transactions;
create policy recurring_transactions_select_members
on public.recurring_transactions
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists recurring_transactions_insert_writers
  on public.recurring_transactions;
create policy recurring_transactions_insert_writers
on public.recurring_transactions
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists recurring_transactions_update_writers
  on public.recurring_transactions;
create policy recurring_transactions_update_writers
on public.recurring_transactions
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists recurring_transactions_delete_writers
  on public.recurring_transactions;
create policy recurring_transactions_delete_writers
on public.recurring_transactions
for delete
to authenticated
using (public.can_write_household(household_id));
