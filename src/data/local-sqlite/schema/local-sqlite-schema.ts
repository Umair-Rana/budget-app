export const localSchemaMigrationsTableSql = `
create table if not exists schema_migrations (
  id text primary key,
  applied_at text not null
);
`.trim()

export const localFinanceTables = [
  'households',
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'notifications',
] as const

export const localInfrastructureTables = [
  'schema_migrations',
  'local_sync_metadata',
  'operation_queue',
  'sync_conflicts',
  'tombstones',
] as const

export const localHouseholdOwnedTables = [
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'notifications',
  'local_sync_metadata',
  'operation_queue',
  'sync_conflicts',
  'tombstones',
] as const

export const localSoftDeleteTables = [
  'households',
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'notifications',
] as const

export const localUpdatedAtTables = [
  ...localSoftDeleteTables,
  'local_sync_metadata',
  'operation_queue',
  'sync_conflicts',
  'tombstones',
] as const

export const localFinanceTableSql = {
  accounts: `
create table if not exists accounts (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  type text not null,
  currency text not null default 'PKR',
  opening_balance real not null default 0,
  current_balance real not null default 0,
  institution text,
  color text,
  icon text,
  notes text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  bills: `
create table if not exists bills (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  amount real not null,
  category_id text not null,
  payment_account_id text,
  due_date text not null,
  frequency text not null,
  status text not null,
  paid_at text,
  next_due_date text,
  last_generated_date text,
  linked_transaction_id text,
  notes text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  budgets: `
create table if not exists budgets (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  month text not null,
  category_id text not null,
  planned_amount real not null,
  group_name text,
  notes text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  categories: `
create table if not exists categories (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  type text not null,
  icon text,
  color text,
  is_default integer not null default 0,
  default_key text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  goals: `
create table if not exists goals (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  target_amount real not null,
  current_amount real not null default 0,
  target_date text,
  priority text not null,
  status text not null,
  icon text,
  color text,
  notes text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  household_members: `
create table if not exists household_members (
  id text primary key,
  household_id text not null,
  user_id text not null,
  role text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);
`.trim(),
  households: `
create table if not exists households (
  id text primary key,
  name text not null,
  currency text not null default 'PKR',
  locale text not null default 'en-PK',
  created_by text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  loans: `
create table if not exists loans (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  type text not null,
  counterparty text,
  principal_amount real not null,
  outstanding_amount real not null,
  interest_rate real,
  due_date text,
  status text not null,
  source_account_id text,
  receiving_account_id text,
  linked_transaction_id text,
  notes text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  notifications: `
create table if not exists notifications (
  id text primary key,
  household_id text not null,
  user_id text,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id text,
  dismissed_at text,
  read_at text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);
`.trim(),
  recurring_bills: `
create table if not exists recurring_bills (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  name text not null,
  amount real not null,
  category_id text not null,
  frequency text not null,
  interval integer not null,
  start_date text not null,
  next_due_date text not null,
  end_date text,
  auto_generate_days_before_due integer not null default 0,
  is_active integer not null default 1,
  notes text,
  last_generated_at text,
  last_generated_for_date text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  recurring_transactions: `
create table if not exists recurring_transactions (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  type text not null,
  name text not null,
  amount real not null,
  category_id text,
  from_account_id text,
  to_account_id text,
  frequency text not null,
  interval integer not null,
  start_date text not null,
  next_run_date text not null,
  end_date text,
  is_active integer not null default 1,
  notes text,
  last_generated_at text,
  last_generated_for_date text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
  transactions: `
create table if not exists transactions (
  id text primary key,
  household_id text not null,
  created_by text,
  updated_by text,
  type text not null,
  amount real not null,
  date text not null,
  time text,
  transaction_datetime text,
  category_id text,
  from_account_id text,
  to_account_id text,
  payment_method text,
  notes text,
  tags_json text,
  receipt_name text,
  receipt_path text,
  receipt_thumbnail text,
  linked_bill_id text,
  linked_goal_id text,
  linked_loan_id text,
  linked_source_type text,
  linked_source_id text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);
`.trim(),
} as const

export const localInfrastructureTableSql = {
  local_sync_metadata: `
create table if not exists local_sync_metadata (
  id text primary key,
  household_id text not null,
  entity_type text not null,
  last_pulled_at text,
  last_pushed_at text,
  remote_cursor text,
  created_at text not null,
  updated_at text not null
);
`.trim(),
  operation_queue: `
create table if not exists operation_queue (
  id text primary key,
  household_id text not null,
  operation_type text not null,
  entity_type text not null,
  entity_id text,
  payload_json text not null,
  status text not null,
  attempt_count integer not null default 0,
  idempotency_key text not null,
  last_error text,
  created_at text not null,
  updated_at text not null,
  next_retry_at text
);
`.trim(),
  sync_conflicts: `
create table if not exists sync_conflicts (
  id text primary key,
  household_id text not null,
  operation_queue_id text,
  entity_type text not null,
  entity_id text,
  local_value_json text not null,
  remote_value_json text not null,
  resolution_status text not null,
  reason text not null,
  created_at text not null,
  updated_at text not null,
  resolved_at text
);
`.trim(),
  tombstones: `
create table if not exists tombstones (
  id text primary key,
  household_id text not null,
  entity_type text not null,
  entity_id text not null,
  deleted_at text not null,
  remote_deleted_at text,
  created_at text not null,
  updated_at text not null
);
`.trim(),
} as const

export const localSqliteIndexSql = [
  'create index if not exists idx_household_members_household_id on household_members (household_id);',
  'create index if not exists idx_household_members_user_id on household_members (user_id);',
  'create index if not exists idx_household_members_deleted_at on household_members (deleted_at);',
  'create index if not exists idx_accounts_household_id on accounts (household_id);',
  'create index if not exists idx_accounts_updated_at on accounts (updated_at);',
  'create index if not exists idx_accounts_deleted_at on accounts (deleted_at);',
  'create index if not exists idx_categories_household_id on categories (household_id);',
  'create index if not exists idx_categories_updated_at on categories (updated_at);',
  'create index if not exists idx_categories_deleted_at on categories (deleted_at);',
  'create index if not exists idx_transactions_household_id on transactions (household_id);',
  'create index if not exists idx_transactions_updated_at on transactions (updated_at);',
  'create index if not exists idx_transactions_deleted_at on transactions (deleted_at);',
  'create index if not exists idx_transactions_account_id on transactions (from_account_id, to_account_id);',
  'create index if not exists idx_transactions_category_id on transactions (category_id);',
  'create index if not exists idx_transactions_transaction_date on transactions (date);',
  'create index if not exists idx_bills_household_id on bills (household_id);',
  'create index if not exists idx_bills_updated_at on bills (updated_at);',
  'create index if not exists idx_bills_deleted_at on bills (deleted_at);',
  'create index if not exists idx_bills_category_id on bills (category_id);',
  'create index if not exists idx_bills_account_id on bills (payment_account_id);',
  'create index if not exists idx_bills_due_date on bills (due_date);',
  'create index if not exists idx_goals_household_id on goals (household_id);',
  'create index if not exists idx_goals_updated_at on goals (updated_at);',
  'create index if not exists idx_goals_deleted_at on goals (deleted_at);',
  'create index if not exists idx_loans_household_id on loans (household_id);',
  'create index if not exists idx_loans_updated_at on loans (updated_at);',
  'create index if not exists idx_loans_deleted_at on loans (deleted_at);',
  'create index if not exists idx_loans_account_id on loans (source_account_id, receiving_account_id);',
  'create index if not exists idx_loans_due_date on loans (due_date);',
  'create index if not exists idx_budgets_household_id on budgets (household_id);',
  'create index if not exists idx_budgets_updated_at on budgets (updated_at);',
  'create index if not exists idx_budgets_deleted_at on budgets (deleted_at);',
  'create index if not exists idx_budgets_category_id on budgets (category_id);',
  'create index if not exists idx_recurring_transactions_household_id on recurring_transactions (household_id);',
  'create index if not exists idx_recurring_transactions_updated_at on recurring_transactions (updated_at);',
  'create index if not exists idx_recurring_transactions_deleted_at on recurring_transactions (deleted_at);',
  'create index if not exists idx_recurring_transactions_account_id on recurring_transactions (from_account_id, to_account_id);',
  'create index if not exists idx_recurring_transactions_category_id on recurring_transactions (category_id);',
  'create index if not exists idx_recurring_transactions_due_date on recurring_transactions (next_run_date);',
  'create index if not exists idx_recurring_bills_household_id on recurring_bills (household_id);',
  'create index if not exists idx_recurring_bills_updated_at on recurring_bills (updated_at);',
  'create index if not exists idx_recurring_bills_deleted_at on recurring_bills (deleted_at);',
  'create index if not exists idx_recurring_bills_category_id on recurring_bills (category_id);',
  'create index if not exists idx_recurring_bills_due_date on recurring_bills (next_due_date);',
  'create index if not exists idx_notifications_household_id on notifications (household_id);',
  'create index if not exists idx_notifications_updated_at on notifications (updated_at);',
  'create index if not exists idx_notifications_deleted_at on notifications (deleted_at);',
  'create index if not exists idx_local_sync_metadata_household_id on local_sync_metadata (household_id);',
  'create index if not exists idx_local_sync_metadata_updated_at on local_sync_metadata (updated_at);',
  'create index if not exists idx_operation_queue_household_id on operation_queue (household_id);',
  'create index if not exists idx_operation_queue_status on operation_queue (status);',
  'create index if not exists idx_operation_queue_created_at on operation_queue (created_at);',
  'create unique index if not exists idx_operation_queue_idempotency_key on operation_queue (idempotency_key);',
  'create index if not exists idx_sync_conflicts_household_id on sync_conflicts (household_id);',
  'create index if not exists idx_sync_conflicts_updated_at on sync_conflicts (updated_at);',
  'create index if not exists idx_tombstones_household_id on tombstones (household_id);',
  'create index if not exists idx_tombstones_updated_at on tombstones (updated_at);',
  'create index if not exists idx_tombstones_deleted_at on tombstones (deleted_at);',
] as const

export const localInitialSchemaStatements = [
  localSchemaMigrationsTableSql,
  localFinanceTableSql.households,
  localFinanceTableSql.household_members,
  localFinanceTableSql.accounts,
  localFinanceTableSql.categories,
  localFinanceTableSql.transactions,
  localFinanceTableSql.bills,
  localFinanceTableSql.goals,
  localFinanceTableSql.loans,
  localFinanceTableSql.budgets,
  localFinanceTableSql.recurring_transactions,
  localFinanceTableSql.recurring_bills,
  localFinanceTableSql.notifications,
  localInfrastructureTableSql.local_sync_metadata,
  localInfrastructureTableSql.operation_queue,
  localInfrastructureTableSql.sync_conflicts,
  localInfrastructureTableSql.tombstones,
  ...localSqliteIndexSql,
] as const
