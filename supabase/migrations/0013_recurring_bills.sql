-- Household Finance - recurring bill schedules.
-- Recurring bills generate normal unpaid bill rows. Payments still use the
-- existing bill payment RPC flow so account balances change only when marked paid.

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  amount numeric not null check (amount > 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  interval integer not null default 1 check (interval >= 1),
  start_date date not null,
  next_due_date date not null,
  end_date date,
  auto_generate_days_before_due integer not null default 0 check (
    auto_generate_days_before_due >= 0
  ),
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
  check (next_due_date >= start_date),
  check (end_date is null or end_date >= start_date)
);

create index recurring_bills_household_id_idx
  on public.recurring_bills (household_id);

create index recurring_bills_household_deleted_at_idx
  on public.recurring_bills (household_id, deleted_at);

create index recurring_bills_household_next_due_idx
  on public.recurring_bills (household_id, next_due_date);

create index recurring_bills_household_due_active_idx
  on public.recurring_bills (household_id, next_due_date)
  where is_active = true and archived_at is null and deleted_at is null;

create index recurring_bills_household_category_idx
  on public.recurring_bills (household_id, category_id);

create unique index recurring_bills_last_generated_unique_idx
  on public.recurring_bills (household_id, id, last_generated_for_date)
  where last_generated_for_date is not null;

drop trigger if exists recurring_bills_set_updated_at
  on public.recurring_bills;
create trigger recurring_bills_set_updated_at
before update on public.recurring_bills
for each row execute function public.set_updated_at();

alter table public.recurring_bills enable row level security;

drop policy if exists recurring_bills_select_members
  on public.recurring_bills;
create policy recurring_bills_select_members
on public.recurring_bills
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists recurring_bills_insert_writers
  on public.recurring_bills;
create policy recurring_bills_insert_writers
on public.recurring_bills
for insert
to authenticated
with check (public.can_write_household(household_id));

drop policy if exists recurring_bills_update_writers
  on public.recurring_bills;
create policy recurring_bills_update_writers
on public.recurring_bills
for update
to authenticated
using (public.can_write_household(household_id))
with check (public.can_write_household(household_id));

drop policy if exists recurring_bills_delete_writers
  on public.recurring_bills;
create policy recurring_bills_delete_writers
on public.recurring_bills
for delete
to authenticated
using (public.can_write_household(household_id));

create or replace function public.generate_due_recurring_bills(
  p_household_id uuid,
  p_as_of_date date default current_date,
  p_generated_at timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  recurring_schedule public.recurring_bills%rowtype;
  scheduled_date date;
  calculated_next_due_date date;
  remains_active boolean;
  inserted_bill public.bills;
  generated_items jsonb := '[]'::jsonb;
  skipped_items jsonb := '[]'::jsonb;
  failed_items jsonb := '[]'::jsonb;
  generated_count integer := 0;
  skipped_count integer := 0;
  failed_count integer := 0;
begin
  perform public._assert_finance_transaction_write_access(p_household_id);

  if p_as_of_date is null then
    raise exception 'As-of date is required.';
  end if;

  for recurring_schedule in
    select *
    from public.recurring_bills recurring
    where recurring.household_id = p_household_id
      and recurring.is_active = true
      and recurring.archived_at is null
      and recurring.deleted_at is null
      and recurring.next_due_date <= (
        p_as_of_date + recurring.auto_generate_days_before_due
      )
      and (
        recurring.end_date is null
        or recurring.next_due_date <= recurring.end_date
      )
    order by recurring.next_due_date asc, recurring.created_at asc
    for update
  loop
    scheduled_date := recurring_schedule.next_due_date;

    if recurring_schedule.last_generated_for_date = scheduled_date then
      skipped_count := skipped_count + 1;
      skipped_items := skipped_items || jsonb_build_array(
        jsonb_build_object(
          'recurringBillId', recurring_schedule.id,
          'scheduledDate', scheduled_date,
          'reason', 'Already generated for this scheduled date.'
        )
      );
      continue;
    end if;

    begin
      inserted_bill := public.create_finance_bill(
        p_household_id := p_household_id,
        p_bill_id := gen_random_uuid(),
        p_name := recurring_schedule.name,
        p_amount := recurring_schedule.amount,
        p_category_id := recurring_schedule.category_id,
        p_due_date := scheduled_date,
        p_frequency := recurring_schedule.frequency,
        p_notes := recurring_schedule.notes,
        p_created_at := p_generated_at,
        p_updated_at := p_generated_at
      );

      calculated_next_due_date := public._recurring_next_run_date(
        scheduled_date,
        recurring_schedule.frequency,
        recurring_schedule.interval
      );
      remains_active :=
        recurring_schedule.end_date is null
        or calculated_next_due_date <= recurring_schedule.end_date;

      update public.recurring_bills recurring
      set
        next_due_date = calculated_next_due_date,
        is_active = remains_active,
        last_generated_at = p_generated_at,
        last_generated_for_date = scheduled_date,
        updated_at = p_generated_at,
        updated_by = auth.uid()
      where recurring.household_id = p_household_id
        and recurring.id = recurring_schedule.id;

      generated_count := generated_count + 1;
      generated_items := generated_items || jsonb_build_array(
        jsonb_build_object(
          'recurringBillId', recurring_schedule.id,
          'scheduledDate', scheduled_date,
          'billId', inserted_bill.id
        )
      );
    exception when others then
      failed_count := failed_count + 1;
      failed_items := failed_items || jsonb_build_array(
        jsonb_build_object(
          'recurringBillId', recurring_schedule.id,
          'scheduledDate', scheduled_date,
          'message', sqlerrm
        )
      );
    end;
  end loop;

  return jsonb_build_object(
    'generatedCount', generated_count,
    'skippedCount', skipped_count,
    'failedCount', failed_count,
    'generated', generated_items,
    'skipped', skipped_items,
    'failed', failed_items
  );
end;
$$;

revoke all on function public.generate_due_recurring_bills(
  uuid,
  date,
  timestamptz
)
from public, anon;

grant execute on function public.generate_due_recurring_bills(
  uuid,
  date,
  timestamptz
)
to authenticated;
