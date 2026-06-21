-- Household Finance - initial Supabase schema draft.
-- Milestone 4D creates schema artifacts only. The runtime app still uses
-- IndexedDB repositories until a later milestone intentionally switches data
-- sources.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  currency text not null default 'PKR' check (length(trim(currency)) > 0),
  locale text not null default 'en-PK' check (length(trim(locale)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (
    type in (
      'cash',
      'bank',
      'wallet',
      'credit_card',
      'savings',
      'investment',
      'loan_account',
      'other'
    )
  ),
  currency text not null default 'PKR',
  opening_balance numeric not null default 0,
  current_balance numeric not null default 0,
  institution text,
  color text,
  icon text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income', 'expense', 'adjustment')),
  icon text,
  color text,
  is_default boolean not null default false,
  default_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_amount numeric not null check (target_amount >= 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  target_date date,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('active', 'completed', 'archived')),
  icon text,
  color text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('given', 'taken')),
  counterparty text,
  principal_amount numeric not null check (principal_amount >= 0),
  outstanding_amount numeric not null check (outstanding_amount >= 0),
  interest_rate numeric check (interest_rate is null or interest_rate >= 0),
  due_date date,
  status text not null check (
    status in ('active', 'partially_paid', 'completed', 'overdue', 'archived')
  ),
  source_account_id uuid references public.accounts(id) on delete set null,
  receiving_account_id uuid references public.accounts(id) on delete set null,
  linked_transaction_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount numeric not null check (amount >= 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  payment_account_id uuid references public.accounts(id) on delete set null,
  due_date date not null,
  frequency text not null check (
    frequency in ('none', 'weekly', 'monthly', 'quarterly', 'yearly')
  ),
  status text not null check (
    status in ('pending', 'paid', 'overdue', 'upcoming')
  ),
  paid_at timestamptz,
  next_due_date date,
  last_generated_date date,
  linked_transaction_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  category_id uuid not null references public.categories(id) on delete restrict,
  planned_amount numeric not null check (planned_amount >= 0),
  group_name text check (
    group_name is null
    or group_name in ('needs', 'wants', 'savings', 'loans', 'custom')
  ),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (
    type in ('income', 'expense', 'transfer', 'adjustment')
  ),
  amount numeric not null check (amount >= 0),
  date date not null,
  time time,
  transaction_datetime timestamptz,
  category_id uuid references public.categories(id) on delete set null,
  from_account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  payment_method text,
  notes text,
  tags text[] not null default '{}',
  receipt_name text,
  receipt_path text,
  receipt_thumbnail text,
  linked_bill_id uuid references public.bills(id) on delete set null,
  linked_goal_id uuid references public.goals(id) on delete set null,
  linked_loan_id uuid references public.loans(id) on delete set null,
  linked_source_type text check (
    linked_source_type is null
    or linked_source_type in ('bill', 'goal', 'loan')
  ),
  linked_source_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

alter table public.bills
  add constraint bills_linked_transaction_id_fkey
  foreign key (linked_transaction_id)
  references public.transactions(id)
  on delete set null;

alter table public.loans
  add constraint loans_linked_transaction_id_fkey
  foreign key (linked_transaction_id)
  references public.transactions(id)
  on delete set null;

create table public.audit_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id uuid,
  action text not null check (length(trim(action)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_email_idx
  on public.profiles (email);

create index households_created_by_idx
  on public.households (created_by);

create index households_deleted_at_idx
  on public.households (deleted_at);

create index household_members_household_id_idx
  on public.household_members (household_id);

create index household_members_user_id_idx
  on public.household_members (user_id);

create index household_members_role_idx
  on public.household_members (household_id, role);

create index accounts_household_id_idx
  on public.accounts (household_id);

create index accounts_household_deleted_at_idx
  on public.accounts (household_id, deleted_at);

create index accounts_household_archived_at_idx
  on public.accounts (household_id, archived_at);

create index accounts_household_type_idx
  on public.accounts (household_id, type);

create index categories_household_id_idx
  on public.categories (household_id);

create index categories_household_deleted_at_idx
  on public.categories (household_id, deleted_at);

create index categories_household_archived_at_idx
  on public.categories (household_id, archived_at);

create index categories_household_type_idx
  on public.categories (household_id, type);

create unique index categories_household_type_name_active_idx
  on public.categories (household_id, type, lower(name))
  where deleted_at is null and archived_at is null;

create index transactions_household_id_idx
  on public.transactions (household_id);

create index transactions_household_deleted_at_idx
  on public.transactions (household_id, deleted_at);

create index transactions_household_date_idx
  on public.transactions (household_id, date desc);

create index transactions_household_datetime_idx
  on public.transactions (household_id, transaction_datetime desc);

create index transactions_household_category_idx
  on public.transactions (household_id, category_id);

create index transactions_household_from_account_idx
  on public.transactions (household_id, from_account_id);

create index transactions_household_to_account_idx
  on public.transactions (household_id, to_account_id);

create index transactions_linked_bill_idx
  on public.transactions (linked_bill_id);

create index transactions_linked_goal_idx
  on public.transactions (linked_goal_id);

create index transactions_linked_loan_idx
  on public.transactions (linked_loan_id);

create index bills_household_id_idx
  on public.bills (household_id);

create index bills_household_deleted_at_idx
  on public.bills (household_id, deleted_at);

create index bills_household_due_date_idx
  on public.bills (household_id, due_date);

create index bills_household_status_idx
  on public.bills (household_id, status);

create index bills_household_category_idx
  on public.bills (household_id, category_id);

create index bills_linked_transaction_idx
  on public.bills (linked_transaction_id);

create index goals_household_id_idx
  on public.goals (household_id);

create index goals_household_deleted_at_idx
  on public.goals (household_id, deleted_at);

create index goals_household_status_idx
  on public.goals (household_id, status);

create index goals_household_target_date_idx
  on public.goals (household_id, target_date);

create index loans_household_id_idx
  on public.loans (household_id);

create index loans_household_deleted_at_idx
  on public.loans (household_id, deleted_at);

create index loans_household_status_idx
  on public.loans (household_id, status);

create index loans_household_type_idx
  on public.loans (household_id, type);

create index loans_household_due_date_idx
  on public.loans (household_id, due_date);

create index loans_linked_transaction_idx
  on public.loans (linked_transaction_id);

create index budgets_household_id_idx
  on public.budgets (household_id);

create index budgets_household_deleted_at_idx
  on public.budgets (household_id, deleted_at);

create index budgets_household_month_idx
  on public.budgets (household_id, month);

create index budgets_household_category_idx
  on public.budgets (household_id, category_id);

create unique index budgets_household_month_category_active_idx
  on public.budgets (household_id, month, category_id)
  where deleted_at is null and archived_at is null;

create index audit_history_household_id_idx
  on public.audit_history (household_id);

create index audit_history_household_created_at_idx
  on public.audit_history (household_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

drop trigger if exists household_members_set_updated_at on public.household_members;
create trigger household_members_set_updated_at
before update on public.household_members
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();
