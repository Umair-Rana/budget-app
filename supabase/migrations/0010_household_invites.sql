-- Household Finance - household sharing invites.
-- This enables a simple owner-created invite flow without email sending or
-- household switching UI.

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_email text not null check (length(trim(invited_email)) > 0),
  role text not null default 'member'
    check (role in ('owner', 'member', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz
);

create index household_invites_household_id_idx
  on public.household_invites (household_id);

create index household_invites_invited_email_idx
  on public.household_invites (lower(invited_email));

create index household_invites_status_idx
  on public.household_invites (household_id, status);

create unique index household_invites_pending_unique_idx
  on public.household_invites (household_id, lower(invited_email))
  where status = 'pending' and deleted_at is null;

alter table public.household_invites enable row level security;

drop policy if exists household_invites_select_related
  on public.household_invites;
create policy household_invites_select_related
on public.household_invites
for select
to authenticated
using (
  public.is_household_member(household_id)
  or (
    status = 'pending'
    and deleted_at is null
    and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists household_invites_insert_owners
  on public.household_invites;
create policy household_invites_insert_owners
on public.household_invites
for insert
to authenticated
with check (public.is_household_owner(household_id));

drop policy if exists household_invites_update_owners
  on public.household_invites;
create policy household_invites_update_owners
on public.household_invites
for update
to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

drop policy if exists household_invites_delete_owners
  on public.household_invites;
create policy household_invites_delete_owners
on public.household_invites
for delete
to authenticated
using (public.is_household_owner(household_id));

create or replace function public.create_household_invite(
  p_household_id uuid,
  p_invited_email text,
  p_role text default 'member'
)
returns public.household_invites
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_invited_email, '')));
  normalized_role text := lower(btrim(coalesce(nullif(p_role, ''), 'member')));
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  existing_member_id uuid;
  result public.household_invites;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  if not public.is_household_owner(p_household_id) then
    raise exception 'Only household owners can invite members.'
      using errcode = '42501';
  end if;

  if normalized_email = '' or position('@' in normalized_email) = 0 then
    raise exception 'Invite email is required.'
      using errcode = '22023';
  end if;

  if current_email <> '' and normalized_email = current_email then
    raise exception 'You cannot invite yourself.'
      using errcode = '22023';
  end if;

  if normalized_role not in ('member', 'viewer') then
    raise exception 'Only member or viewer invites are supported.'
      using errcode = '22023';
  end if;

  select member.user_id
  from public.household_members member
  join public.profiles profile
    on profile.id = member.user_id
  where member.household_id = p_household_id
    and lower(coalesce(profile.email, '')) = normalized_email
  limit 1
  into existing_member_id;

  if existing_member_id is not null then
    raise exception 'This user is already a household member.'
      using errcode = '23505';
  end if;

  insert into public.household_invites (
    household_id,
    invited_email,
    role,
    invited_by,
    status,
    created_at
  )
  values (
    p_household_id,
    normalized_email,
    normalized_role,
    auth.uid(),
    'pending',
    now()
  )
  returning *
  into result;

  return result;
end;
$$;

create or replace function public.accept_household_invite(
  p_invite_id uuid
)
returns public.households
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite public.household_invites;
  selected_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  if current_email = '' then
    raise exception 'Your authenticated account does not have an email address.'
      using errcode = '22023';
  end if;

  select *
  from public.household_invites
  where id = p_invite_id
    and deleted_at is null
  into invite;

  if invite.id is null then
    raise exception 'Household invite was not found.'
      using errcode = 'P0002';
  end if;

  if lower(invite.invited_email) <> current_email then
    raise exception 'This invite belongs to a different email address.'
      using errcode = '42501';
  end if;

  if invite.status <> 'pending' then
    raise exception 'This invite is no longer pending.'
      using errcode = '22023';
  end if;

  if invite.expires_at is not null and invite.expires_at < now() then
    update public.household_invites
    set status = 'expired'
    where id = invite.id;

    raise exception 'This invite has expired.'
      using errcode = '22023';
  end if;

  insert into public.profiles (
    id,
    email
  )
  values (
    auth.uid(),
    current_email
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    updated_at = now();

  insert into public.household_members (
    household_id,
    user_id,
    role
  )
  values (
    invite.household_id,
    auth.uid(),
    invite.role
  )
  on conflict (household_id, user_id) do update
  set
    role = case
      when public.household_members.role = 'owner' then 'owner'
      else excluded.role
    end,
    updated_at = now();

  update public.household_invites
  set
    accepted_by = auth.uid(),
    accepted_at = now(),
    status = 'accepted'
  where id = invite.id;

  select *
  from public.households
  where id = invite.household_id
  into selected_household;

  return selected_household;
end;
$$;

create or replace function public.revoke_household_invite(
  p_invite_id uuid
)
returns public.household_invites
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  invite public.household_invites;
  result public.household_invites;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '28000';
  end if;

  select *
  from public.household_invites
  where id = p_invite_id
    and deleted_at is null
  into invite;

  if invite.id is null then
    raise exception 'Household invite was not found.'
      using errcode = 'P0002';
  end if;

  if not public.is_household_owner(invite.household_id) then
    raise exception 'Only household owners can revoke invites.'
      using errcode = '42501';
  end if;

  if invite.status <> 'pending' then
    raise exception 'Only pending invites can be revoked.'
      using errcode = '22023';
  end if;

  update public.household_invites
  set status = 'revoked'
  where id = invite.id
  returning *
  into result;

  return result;
end;
$$;

create or replace function public.get_my_household_invites()
returns table (
  id uuid,
  household_id uuid,
  household_name text,
  invited_email text,
  role text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    invite.id,
    invite.household_id,
    household.name as household_name,
    invite.invited_email,
    invite.role,
    invite.status,
    invite.created_at,
    invite.expires_at
  from public.household_invites invite
  join public.households household
    on household.id = invite.household_id
  where auth.uid() is not null
    and invite.status = 'pending'
    and invite.deleted_at is null
    and (invite.expires_at is null or invite.expires_at >= now())
    and lower(invite.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and household.archived_at is null
    and household.deleted_at is null
  order by invite.created_at asc;
$$;

create or replace function public.get_household_members(
  p_household_id uuid
)
returns table (
  id uuid,
  household_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    member.id,
    member.household_id,
    member.user_id,
    profile.email,
    member.role,
    member.created_at
  from public.household_members member
  left join public.profiles profile
    on profile.id = member.user_id
  where auth.uid() is not null
    and public.is_household_member(p_household_id)
    and member.household_id = p_household_id
  order by
    case member.role
      when 'owner' then 0
      when 'member' then 1
      else 2
    end,
    member.created_at asc;
$$;

create or replace function public.get_household_pending_invites(
  p_household_id uuid
)
returns table (
  id uuid,
  household_id uuid,
  invited_email text,
  role text,
  status text,
  invited_by uuid,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    invite.id,
    invite.household_id,
    invite.invited_email,
    invite.role,
    invite.status,
    invite.invited_by,
    invite.created_at,
    invite.expires_at
  from public.household_invites invite
  where auth.uid() is not null
    and public.is_household_member(p_household_id)
    and invite.household_id = p_household_id
    and invite.status = 'pending'
    and invite.deleted_at is null
    and (invite.expires_at is null or invite.expires_at >= now())
  order by invite.created_at desc;
$$;

revoke all on function public.create_household_invite(uuid, text, text)
from public, anon;
revoke all on function public.accept_household_invite(uuid)
from public, anon;
revoke all on function public.revoke_household_invite(uuid)
from public, anon;
revoke all on function public.get_my_household_invites()
from public, anon;
revoke all on function public.get_household_members(uuid)
from public, anon;
revoke all on function public.get_household_pending_invites(uuid)
from public, anon;

grant execute on function public.create_household_invite(uuid, text, text)
to authenticated;
grant execute on function public.accept_household_invite(uuid)
to authenticated;
grant execute on function public.revoke_household_invite(uuid)
to authenticated;
grant execute on function public.get_my_household_invites()
to authenticated;
grant execute on function public.get_household_members(uuid)
to authenticated;
grant execute on function public.get_household_pending_invites(uuid)
to authenticated;
