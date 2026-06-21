import type { EntityId, FinanceRecord, IsoDateString } from '@/data/models/common'
import type { TransactionType } from '@/data/models/transaction'

export type RecurringTransactionType = Extract<
  TransactionType,
  'income' | 'expense' | 'transfer'
>

export type RecurringTransactionFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export type RecurringTransaction = FinanceRecord & {
  type: RecurringTransactionType
  name: string
  amount: number
  categoryId?: EntityId
  fromAccountId?: EntityId
  toAccountId?: EntityId
  frequency: RecurringTransactionFrequency
  interval: number
  startDate: IsoDateString
  nextRunDate: IsoDateString
  endDate?: IsoDateString
  isActive: boolean
  notes?: string
  lastGeneratedAt?: string
  lastGeneratedForDate?: IsoDateString
}

export type CreateRecurringTransactionInput = {
  type: RecurringTransactionType
  name: string
  amount: number
  categoryId?: EntityId
  fromAccountId?: EntityId
  toAccountId?: EntityId
  frequency: RecurringTransactionFrequency
  interval: number
  startDate: IsoDateString
  nextRunDate: IsoDateString
  endDate?: IsoDateString
  isActive?: boolean
  notes?: string
}

export type UpdateRecurringTransactionInput =
  Partial<CreateRecurringTransactionInput>

export type GenerateRecurringTransactionsResult = {
  generatedCount: number
  skippedCount: number
  failedCount: number
  generated: Array<{
    recurringTransactionId: EntityId
    scheduledDate: IsoDateString
    transactionId: EntityId
  }>
  skipped: Array<{
    recurringTransactionId: EntityId
    reason: string
    scheduledDate?: IsoDateString
  }>
  failed: Array<{
    recurringTransactionId: EntityId
    message: string
    scheduledDate?: IsoDateString
  }>
}
