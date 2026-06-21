-- Household Finance - draft RLS policies.
-- These policies are intended as a safe starting point and must be reviewed
-- against the final repository/RPC design before production use.

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members member
    where member.household_id = target_household_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.household_role(target_household_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select member.role
  from public.household_members member
  where member.household_id = target_household_id
    and member.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_write_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.household_role(target_household_id) in ('owner', 'member'),
    false
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.household_role(target_household_id) = 'owner', false);
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.goals enable row level security;
alter table public.loans enable row level security;
alter table public.budgets enable row level security;
alter table public.audit_history enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists households_select_members on public.households;
create policy households_select_members
on public.households
for select
to authenticated
using (public.is_household_member(id));

drop policy if exists households_insert_creator on public.households;
create policy households_insert_creator
on public.households
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists households_update_owners on public.households;
create policy households_update_owners
on public.households
for update
to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

drop policy if exists households_delete_owners on public.households;
create policy households_delete_owners
on public.households
for delete
to authenticated
using (public.is_household_owner(id));

drop policy if exists household_members_select_members on public.household_members;
create policy household_members_select_members
on public.household_members
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists household_members_insert_owners on public.household_members;
create policy household_members_insert_owners
on public.household_members
for insert
to authenticated
with check (
  public.is_household_owner(household_id)
  or (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1
      from public.households household
      where household.id = household_id
        and household.created_by = auth.uid()
    )
  )
);

drop policy if exists household_members_update_owners on public.household_members;
create policy household_members_update_owners
on public.household_members
for update
to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

drop policy if exists household_members_delete_owners on public.household_members;
create policy household_members_delete_owners
on public.household_members
for delete
to authenticated
using (public.is_household_owner(household_id));

drop policy if exists accounts_select_members on public.accounts;
create policy accounts_select_members
on public.accounts
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists accounts_insert_writers on public.accounts;
create policy accounts_insert_writers
on public.accounts
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists accounts_update_writers on public.accounts;
create policy accounts_update_writers
on public.accounts
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists accounts_delete_writers on public.accounts;
create policy accounts_delete_writers
on public.accounts
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists categories_select_members on public.categories;
create policy categories_select_members
on public.categories
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists categories_insert_writers on public.categories;
create policy categories_insert_writers
on public.categories
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists categories_update_writers on public.categories;
create policy categories_update_writers
on public.categories
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists categories_delete_writers on public.categories;
create policy categories_delete_writers
on public.categories
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists transactions_select_members on public.transactions;
create policy transactions_select_members
on public.transactions
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists transactions_insert_writers on public.transactions;
create policy transactions_insert_writers
on public.transactions
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists transactions_update_writers on public.transactions;
create policy transactions_update_writers
on public.transactions
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists transactions_delete_writers on public.transactions;
create policy transactions_delete_writers
on public.transactions
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists bills_select_members on public.bills;
create policy bills_select_members
on public.bills
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists bills_insert_writers on public.bills;
create policy bills_insert_writers
on public.bills
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists bills_update_writers on public.bills;
create policy bills_update_writers
on public.bills
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists bills_delete_writers on public.bills;
create policy bills_delete_writers
on public.bills
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists goals_select_members on public.goals;
create policy goals_select_members
on public.goals
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists goals_insert_writers on public.goals;
create policy goals_insert_writers
on public.goals
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists goals_update_writers on public.goals;
create policy goals_update_writers
on public.goals
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists goals_delete_writers on public.goals;
create policy goals_delete_writers
on public.goals
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists loans_select_members on public.loans;
create policy loans_select_members
on public.loans
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists loans_insert_writers on public.loans;
create policy loans_insert_writers
on public.loans
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists loans_update_writers on public.loans;
create policy loans_update_writers
on public.loans
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists loans_delete_writers on public.loans;
create policy loans_delete_writers
on public.loans
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists budgets_select_members on public.budgets;
create policy budgets_select_members
on public.budgets
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists budgets_insert_writers on public.budgets;
create policy budgets_insert_writers
on public.budgets
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists budgets_update_writers on public.budgets;
create policy budgets_update_writers
on public.budgets
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists budgets_delete_writers on public.budgets;
create policy budgets_delete_writers
on public.budgets
for delete
to authenticated
using (public.can_write_household(household_id));

drop policy if exists audit_history_select_members on public.audit_history;
create policy audit_history_select_members
on public.audit_history
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists audit_history_insert_writers on public.audit_history;
create policy audit_history_insert_writers
on public.audit_history
for insert
to authenticated
with check (public.can_write_household(household_id));
