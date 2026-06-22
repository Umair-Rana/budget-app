import type { AccountType } from '@/data/models/account'
import type { BillFrequency, BillStatus } from '@/data/models/bill'
import type { BudgetGroup } from '@/data/models/budget'
import type { CategoryType } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import type { GoalPriority, GoalStatus } from '@/data/models/goal'
import type { LoanStatus, LoanType } from '@/data/models/loan'
import type { RecurringBillFrequency } from '@/data/models/recurring-bill'
import type {
  RecurringTransactionFrequency,
  RecurringTransactionType,
} from '@/data/models/recurring-transaction'
import type { TransactionType } from '@/data/models/transaction'

type Nullable<T> = T | null

export type SupabaseFinanceMapperContext = {
  householdId: EntityId
  userId?: EntityId
  now?: string
}

export type ProfileRow = {
  id: EntityId
  email: Nullable<string>
  display_name: Nullable<string>
  created_at: string
  updated_at: string
}

export type HouseholdRow = {
  id: EntityId
  name: string
  currency: string
  locale: string
  created_by: Nullable<EntityId>
  created_at: string
  updated_at: string
  archived_at: Nullable<string>
  deleted_at: Nullable<string>
}

export type HouseholdMemberRow = {
  id: EntityId
  household_id: EntityId
  user_id: EntityId
  role: 'owner' | 'member' | 'viewer'
  created_at: string
  updated_at: string
}

export type FinanceRecordRow = {
  id: EntityId
  household_id: EntityId
  created_by: Nullable<EntityId>
  updated_by: Nullable<EntityId>
  created_at: string
  updated_at: string
  archived_at: Nullable<string>
  deleted_at: Nullable<string>
}

export type AccountRow = FinanceRecordRow & {
  name: string
  type: AccountType
  currency: 'PKR'
  opening_balance: number
  current_balance: number
  institution: Nullable<string>
  color: Nullable<string>
  icon: Nullable<string>
  notes: Nullable<string>
}

export type CategoryRow = FinanceRecordRow & {
  name: string
  type: CategoryType
  icon: Nullable<string>
  color: Nullable<string>
  is_default: boolean
  default_key: Nullable<string>
}

export type TransactionRow = FinanceRecordRow & {
  type: TransactionType
  amount: number
  date: string
  time: Nullable<string>
  transaction_datetime: Nullable<string>
  category_id: Nullable<EntityId>
  from_account_id: Nullable<EntityId>
  to_account_id: Nullable<EntityId>
  payment_method: Nullable<string>
  notes: Nullable<string>
  tags: string[]
  receipt_name: Nullable<string>
  receipt_path: Nullable<string>
  receipt_thumbnail: Nullable<string>
  linked_bill_id: Nullable<EntityId>
  linked_goal_id: Nullable<EntityId>
  linked_loan_id: Nullable<EntityId>
  linked_source_type: Nullable<'bill' | 'goal' | 'loan'>
  linked_source_id: Nullable<EntityId>
}

export type BillRow = FinanceRecordRow & {
  name: string
  amount: number
  category_id: EntityId
  payment_account_id: Nullable<EntityId>
  due_date: string
  frequency: BillFrequency
  status: BillStatus
  paid_at: Nullable<string>
  next_due_date: Nullable<string>
  last_generated_date: Nullable<string>
  linked_transaction_id: Nullable<EntityId>
  notes: Nullable<string>
}

export type GoalRow = FinanceRecordRow & {
  name: string
  target_amount: number
  current_amount: number
  target_date: Nullable<string>
  priority: GoalPriority
  status: GoalStatus
  icon: Nullable<string>
  color: Nullable<string>
  notes: Nullable<string>
}

export type LoanRow = FinanceRecordRow & {
  name: string
  type: LoanType
  counterparty: Nullable<string>
  principal_amount: number
  outstanding_amount: number
  interest_rate: Nullable<number>
  due_date: Nullable<string>
  status: LoanStatus
  source_account_id: Nullable<EntityId>
  receiving_account_id: Nullable<EntityId>
  linked_transaction_id: Nullable<EntityId>
  notes: Nullable<string>
}

export type BudgetRow = FinanceRecordRow & {
  month: string
  category_id: EntityId
  planned_amount: number
  group_name: Nullable<BudgetGroup>
  notes: Nullable<string>
}

export type RecurringBillRow = FinanceRecordRow & {
  name: string
  amount: number
  category_id: EntityId
  frequency: RecurringBillFrequency
  interval: number
  start_date: string
  next_due_date: string
  end_date: Nullable<string>
  auto_generate_days_before_due: number
  is_active: boolean
  notes: Nullable<string>
  last_generated_at: Nullable<string>
  last_generated_for_date: Nullable<string>
}

export type RecurringTransactionRow = FinanceRecordRow & {
  type: RecurringTransactionType
  name: string
  amount: number
  category_id: Nullable<EntityId>
  from_account_id: Nullable<EntityId>
  to_account_id: Nullable<EntityId>
  frequency: RecurringTransactionFrequency
  interval: number
  start_date: string
  next_run_date: string
  end_date: Nullable<string>
  is_active: boolean
  notes: Nullable<string>
  last_generated_at: Nullable<string>
  last_generated_for_date: Nullable<string>
}

export type AccountInsertRow = AccountRow
export type CategoryInsertRow = CategoryRow
export type TransactionInsertRow = TransactionRow
export type BillInsertRow = BillRow
export type GoalInsertRow = GoalRow
export type LoanInsertRow = LoanRow
export type BudgetInsertRow = BudgetRow
export type RecurringBillInsertRow = RecurringBillRow
export type RecurringTransactionInsertRow = RecurringTransactionRow

export type AccountUpdateRow = Partial<
  Omit<AccountRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type CategoryUpdateRow = Partial<
  Omit<CategoryRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type TransactionUpdateRow = Partial<
  Omit<TransactionRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type BillUpdateRow = Partial<
  Omit<BillRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type GoalUpdateRow = Partial<
  Omit<GoalRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type LoanUpdateRow = Partial<
  Omit<LoanRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type BudgetUpdateRow = Partial<
  Omit<BudgetRow, 'id' | 'household_id' | 'created_by' | 'created_at'>
>
export type RecurringBillUpdateRow = Partial<
  Omit<
    RecurringBillRow,
    'id' | 'household_id' | 'created_by' | 'created_at'
  >
>
export type RecurringTransactionUpdateRow = Partial<
  Omit<
    RecurringTransactionRow,
    'id' | 'household_id' | 'created_by' | 'created_at'
  >
>
