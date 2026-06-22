-- Household Finance - owner member removal.
-- Membership removal intentionally deletes only the household_members row.
-- Finance records remain scoped to the household and untouched.

create or replace function public.household_owner_count(
  target_household_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.household_members member
  where member.household_id = target_household_id
    and member.role = 'owner';
$$;

drop policy if exists household_members_delete_owners
  on public.household_members;
create policy household_members_delete_owners
on public.household_members
for delete
to authenticated
using (
  public.is_household_owner(household_id)
  and user_id <> auth.uid()
  and (
    role <> 'owner'
    or public.household_owner_count(household_id) > 1
  )
);

create or replace function public.remove_household_member(
  p_household_id uuid,
  p_member_user_id uuid
)
returns public.household_members
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_member public.household_members;
  owner_count integer;
  removed_member public.household_members;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  if not public.is_household_owner(p_household_id) then
    raise exception 'Only household owners can remove members.'
      using errcode = '42501';
  end if;

  if p_member_user_id = auth.uid() then
    raise exception 'You cannot remove yourself from the household.'
      using errcode = '22023';
  end if;

  select *
  from public.household_members member
  where member.household_id = p_household_id
    and member.user_id = p_member_user_id
  into target_member;

  if target_member.id is null then
    raise exception 'Household member was not found.'
      using errcode = 'P0002';
  end if;

  if target_member.role = 'owner' then
    owner_count := public.household_owner_count(p_household_id);

    if owner_count <= 1 then
      raise exception 'You cannot remove the last household owner.'
        using errcode = '22023';
    end if;
  end if;

  delete from public.household_members
  where id = target_member.id
  returning *
  into removed_member;

  return removed_member;
end;
$$;

revoke all on function public.household_owner_count(uuid)
from public, anon;
revoke all on function public.remove_household_member(uuid, uuid)
from public, anon;

grant execute on function public.remove_household_member(uuid, uuid)
to authenticated;
grant execute on function public.household_owner_count(uuid)
to authenticated;
