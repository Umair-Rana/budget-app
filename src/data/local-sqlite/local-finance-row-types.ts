import type { AccountType } from '@/data/models/account'
import type { BillFrequency, BillStatus } from '@/data/models/bill'
import type { BudgetGroup } from '@/data/models/budget'
import type { CategoryType } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import type { GoalPriority, GoalStatus } from '@/data/models/goal'
import type { LoanStatus, LoanType } from '@/data/models/loan'
import type { AppNotificationType } from '@/data/notifications/notification-types'
import type { RecurringBillFrequency } from '@/data/models/recurring-bill'
import type {
  RecurringTransactionFrequency,
  RecurringTransactionType,
} from '@/data/models/recurring-transaction'
import type { TransactionType } from '@/data/models/transaction'

export type LocalSqliteValue = string | number | null
export type LocalSqliteBoolean = 0 | 1

export type LocalFinanceRecordRow = {
  archived_at: string | null
  created_at: string
  created_by: EntityId | null
  deleted_at: string | null
  household_id: EntityId
  id: EntityId
  updated_at: string
  updated_by: EntityId | null
}

export type LocalHouseholdRow = {
  archived_at: string | null
  created_at: string
  created_by: EntityId | null
  currency: string
  deleted_at: string | null
  id: EntityId
  locale: string
  name: string
  updated_at: string
}

export type LocalHouseholdMemberRow = {
  created_at: string
  deleted_at: string | null
  household_id: EntityId
  id: EntityId
  role: 'member' | 'owner' | 'viewer'
  updated_at: string
  user_id: EntityId
}

export type LocalAccountRow = LocalFinanceRecordRow & {
  color: string | null
  currency: 'PKR'
  current_balance: number
  icon: string | null
  institution: string | null
  name: string
  notes: string | null
  opening_balance: number
  type: AccountType
}

export type LocalCategoryRow = LocalFinanceRecordRow & {
  color: string | null
  default_key: string | null
  icon: string | null
  is_default: LocalSqliteBoolean | number
  name: string
  type: CategoryType
}

export type LocalTransactionRow = LocalFinanceRecordRow & {
  amount: number
  category_id: EntityId | null
  date: string
  from_account_id: EntityId | null
  linked_bill_id: EntityId | null
  linked_goal_id: EntityId | null
  linked_loan_id: EntityId | null
  linked_source_id: EntityId | null
  linked_source_type: 'bill' | 'goal' | 'loan' | null
  notes: string | null
  payment_method: string | null
  receipt_name: string | null
  receipt_path: string | null
  receipt_thumbnail: string | null
  tags_json: string | null
  time: string | null
  to_account_id: EntityId | null
  transaction_datetime: string | null
  type: TransactionType
}

export type LocalBillRow = LocalFinanceRecordRow & {
  amount: number
  category_id: EntityId
  due_date: string
  frequency: BillFrequency
  last_generated_date: string | null
  linked_transaction_id: EntityId | null
  name: string
  next_due_date: string | null
  notes: string | null
  paid_at: string | null
  payment_account_id: EntityId | null
  status: BillStatus
}

export type LocalGoalRow = LocalFinanceRecordRow & {
  color: string | null
  current_amount: number
  icon: string | null
  name: string
  notes: string | null
  priority: GoalPriority
  status: GoalStatus
  target_amount: number
  target_date: string | null
}

export type LocalLoanRow = LocalFinanceRecordRow & {
  counterparty: string | null
  due_date: string | null
  interest_rate: number | null
  linked_transaction_id: EntityId | null
  name: string
  notes: string | null
  outstanding_amount: number
  principal_amount: number
  receiving_account_id: EntityId | null
  source_account_id: EntityId | null
  status: LoanStatus
  type: LoanType
}

export type LocalBudgetRow = LocalFinanceRecordRow & {
  category_id: EntityId
  group_name: BudgetGroup | null
  month: string
  notes: string | null
  planned_amount: number
}

export type LocalRecurringTransactionRow = LocalFinanceRecordRow & {
  amount: number
  category_id: EntityId | null
  end_date: string | null
  frequency: RecurringTransactionFrequency
  from_account_id: EntityId | null
  interval: number
  is_active: LocalSqliteBoolean | number
  last_generated_at: string | null
  last_generated_for_date: string | null
  name: string
  next_run_date: string
  notes: string | null
  start_date: string
  to_account_id: EntityId | null
  type: RecurringTransactionType
}

export type LocalRecurringBillRow = LocalFinanceRecordRow & {
  amount: number
  auto_generate_days_before_due: number
  category_id: EntityId
  end_date: string | null
  frequency: RecurringBillFrequency
  interval: number
  is_active: LocalSqliteBoolean | number
  last_generated_at: string | null
  last_generated_for_date: string | null
  name: string
  next_due_date: string
  notes: string | null
  start_date: string
}

export type LocalNotificationRow = {
  created_at: string
  deleted_at: string | null
  dismissed_at: string | null
  entity_id: EntityId | null
  entity_type: string | null
  household_id: EntityId
  id: EntityId
  message: string
  read_at: string | null
  title: string
  type: AppNotificationType
  updated_at: string
  user_id: EntityId | null
}

export type LocalHousehold = {
  currency: string
  id: EntityId
  locale: string
  name: string
}

export type LocalHouseholdMember = {
  createdAt: string
  deletedAt?: string
  householdId: EntityId
  id: EntityId
  role: 'member' | 'owner' | 'viewer'
  updatedAt: string
  userId: EntityId
}
