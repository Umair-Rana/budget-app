-- Household Finance - fresh cloud household bootstrap.
--
-- This RPC creates/selects the first cloud household for an authenticated user
-- without requiring local-to-cloud migration or service-role credentials.

create or replace function public.bootstrap_finance_household(
  p_email text default null
)
returns public.households
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  selected_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  insert into public.profiles (
    id,
    email
  )
  values (
    auth.uid(),
    nullif(btrim(coalesce(p_email, '')), '')
  )
  on conflict (id) do update
  set
    email = coalesce(
      nullif(btrim(coalesce(excluded.email, '')), ''),
      public.profiles.email
    ),
    updated_at = now();

  select household.*
  from public.household_members member
  join public.households household
    on household.id = member.household_id
  where member.user_id = auth.uid()
    and household.archived_at is null
    and household.deleted_at is null
  order by household.created_at asc
  limit 1
  into selected_household;

  if selected_household.id is not null then
    return selected_household;
  end if;

  insert into public.households (
    name,
    currency,
    locale,
    created_by
  )
  values (
    'My Household',
    'PKR',
    'en-PK',
    auth.uid()
  )
  returning *
  into selected_household;

  insert into public.household_members (
    household_id,
    user_id,
    role
  )
  values (
    selected_household.id,
    auth.uid(),
    'owner'
  )
  on conflict (household_id, user_id) do update
  set
    role = 'owner',
    updated_at = now();

  return selected_household;
end;
$$;

revoke all on function public.bootstrap_finance_household(text)
from public, anon;

grant execute on function public.bootstrap_finance_household(text)
to authenticated;
