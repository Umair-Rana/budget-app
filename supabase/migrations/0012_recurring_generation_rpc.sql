-- Household Finance - atomic recurring transaction generation.
-- Generation is intentionally server-side so transaction creation, balance
-- updates, and recurring schedule advancement commit together.

create or replace function public._recurring_next_run_date(
  p_current_date date,
  p_frequency text,
  p_interval integer
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  target_year integer;
  target_month integer;
  target_day integer;
  month_index integer;
  last_day integer;
begin
  if p_current_date is null then
    raise exception 'Current recurring date is required.';
  end if;

  if p_interval is null or p_interval < 1 then
    raise exception 'Interval must be at least 1.';
  end if;

  if p_frequency = 'daily' then
    return p_current_date + p_interval;
  end if;

  if p_frequency = 'weekly' then
    return p_current_date + (p_interval * 7);
  end if;

  if p_frequency = 'monthly' then
    month_index :=
      (extract(year from p_current_date)::integer * 12)
      + (extract(month from p_current_date)::integer - 1)
      + p_interval;
    target_year := month_index / 12;
    target_month := mod(month_index, 12) + 1;
    target_day := extract(day from p_current_date)::integer;
    last_day := extract(
      day from (make_date(target_year, target_month, 1) + interval '1 month - 1 day')
    )::integer;

    return make_date(target_year, target_month, least(target_day, last_day));
  end if;

  if p_frequency = 'yearly' then
    target_year := extract(year from p_current_date)::integer + p_interval;
    target_month := extract(month from p_current_date)::integer;
    target_day := extract(day from p_current_date)::integer;
    last_day := extract(
      day from (make_date(target_year, target_month, 1) + interval '1 month - 1 day')
    )::integer;

    return make_date(target_year, target_month, least(target_day, last_day));
  end if;

  raise exception 'Unsupported recurring frequency.';
end;
$$;

create or replace function public.generate_due_recurring_transactions(
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
  recurring_schedule public.recurring_transactions%rowtype;
  scheduled_date date;
  calculated_next_run_date date;
  remains_active boolean;
  inserted_transaction public.transactions;
  transaction_notes text;
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
    from public.recurring_transactions recurring
    where recurring.household_id = p_household_id
      and recurring.is_active = true
      and recurring.archived_at is null
      and recurring.deleted_at is null
      and recurring.next_run_date <= p_as_of_date
      and (
        recurring.end_date is null
        or recurring.next_run_date <= recurring.end_date
      )
    order by recurring.next_run_date asc, recurring.created_at asc
    for update
  loop
    scheduled_date := recurring_schedule.next_run_date;

    if recurring_schedule.last_generated_for_date = scheduled_date then
      skipped_count := skipped_count + 1;
      skipped_items := skipped_items || jsonb_build_array(
        jsonb_build_object(
          'recurringTransactionId', recurring_schedule.id,
          'scheduledDate', scheduled_date,
          'reason', 'Already generated for this scheduled date.'
        )
      );
      continue;
    end if;

    begin
      transaction_notes := case
        when recurring_schedule.notes is not null
          and length(trim(recurring_schedule.notes)) > 0
        then 'Recurring: ' || recurring_schedule.name || chr(10) || recurring_schedule.notes
        else 'Recurring: ' || recurring_schedule.name
      end;

      inserted_transaction := public.create_finance_transaction(
        p_household_id := p_household_id,
        p_transaction_id := gen_random_uuid(),
        p_type := recurring_schedule.type,
        p_amount := recurring_schedule.amount,
        p_date := scheduled_date,
        p_time := null,
        p_transaction_datetime := null,
        p_category_id := recurring_schedule.category_id,
        p_from_account_id := recurring_schedule.from_account_id,
        p_to_account_id := recurring_schedule.to_account_id,
        p_notes := transaction_notes,
        p_created_at := p_generated_at,
        p_updated_at := p_generated_at
      );

      calculated_next_run_date := public._recurring_next_run_date(
        scheduled_date,
        recurring_schedule.frequency,
        recurring_schedule.interval
      );
      remains_active :=
        recurring_schedule.end_date is null
        or calculated_next_run_date <= recurring_schedule.end_date;

      update public.recurring_transactions recurring
      set
        next_run_date = calculated_next_run_date,
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
          'recurringTransactionId', recurring_schedule.id,
          'scheduledDate', scheduled_date,
          'transactionId', inserted_transaction.id
        )
      );
    exception when others then
      failed_count := failed_count + 1;
      failed_items := failed_items || jsonb_build_array(
        jsonb_build_object(
          'recurringTransactionId', recurring_schedule.id,
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

revoke all on function public._recurring_next_run_date(date, text, integer)
from public, anon, authenticated;

revoke all on function public.generate_due_recurring_transactions(
  uuid,
  date,
  timestamptz
)
from public, anon;

grant execute on function public.generate_due_recurring_transactions(
  uuid,
  date,
  timestamptz
)
to authenticated;
