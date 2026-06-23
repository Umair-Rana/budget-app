do $$
declare
  realtime_table_name text;
  realtime_tables text[] := array[
    'accounts',
    'categories',
    'transactions',
    'bills',
    'goals',
    'loans',
    'budgets',
    'recurring_transactions',
    'recurring_bills',
    'household_members',
    'household_invites'
  ];
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach realtime_table_name in array realtime_tables loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = realtime_table_name
    )
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table_name
      );
    end if;
  end loop;
end $$;
