-- Household Finance - owner household deletion with replacement household.
--
-- This operation is intentionally destructive and atomic at the database
-- transaction level. The current owner loses the old household and immediately
-- receives a clean replacement household so the app can re-bootstrap safely.

create or replace function public.delete_household_and_create_replacement_household(
  p_household_id uuid
)
returns public.households
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_household public.households;
  replacement_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  if p_household_id is null then
    raise exception 'Household id is required.'
      using errcode = '22023';
  end if;

  select *
  from public.households household
  where household.id = p_household_id
    and household.archived_at is null
    and household.deleted_at is null
  for update
  into target_household;

  if target_household.id is null then
    raise exception 'Household was not found.'
      using errcode = 'P0002';
  end if;

  if not public.is_household_owner(p_household_id) then
    raise exception 'Only the household owner can delete this household.'
      using errcode = '42501';
  end if;

  -- Delete child rows deliberately before the household row. This avoids
  -- relying on cascade ordering where category/account restrict and set-null
  -- relationships coexist with household-level cascades.
  delete from public.recurring_bills
  where household_id = p_household_id;

  delete from public.recurring_transactions
  where household_id = p_household_id;

  delete from public.audit_history
  where household_id = p_household_id;

  delete from public.budgets
  where household_id = p_household_id;

  delete from public.bills
  where household_id = p_household_id;

  delete from public.loans
  where household_id = p_household_id;

  delete from public.goals
  where household_id = p_household_id;

  delete from public.transactions
  where household_id = p_household_id;

  delete from public.accounts
  where household_id = p_household_id;

  delete from public.categories
  where household_id = p_household_id;

  delete from public.household_invites
  where household_id = p_household_id;

  delete from public.household_members
  where household_id = p_household_id;

  delete from public.households
  where id = p_household_id;

  insert into public.households (
    name,
    currency,
    locale,
    created_by
  )
  values (
    'My Household',
    coalesce(nullif(target_household.currency, ''), 'PKR'),
    coalesce(nullif(target_household.locale, ''), 'en-PK'),
    auth.uid()
  )
  returning *
  into replacement_household;

  insert into public.household_members (
    household_id,
    user_id,
    role
  )
  values (
    replacement_household.id,
    auth.uid(),
    'owner'
  );

  return replacement_household;
end;
$$;

revoke all on function public.delete_household_and_create_replacement_household(uuid)
from public, anon;

grant execute on function public.delete_household_and_create_replacement_household(uuid)
to authenticated;
