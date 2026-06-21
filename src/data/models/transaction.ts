import type {
  EntityId,
  FinanceRecord,
  IsoDateString,
  IsoDateTimeString,
} from '@/data/models/common'

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment'

export type Transaction = FinanceRecord & {
  type: TransactionType
  amount: number
  categoryId?: EntityId
  fromAccountId?: EntityId
  toAccountId?: EntityId
  paymentMethod?: string
  date: IsoDateString
  time?: string
  transactionDateTime?: IsoDateTimeString
  notes?: string
  tags?: string[]
  receiptName?: string
  receiptPath?: string
  receiptThumbnail?: string
  linkedBillId?: EntityId
  linkedGoalId?: EntityId
  linkedLoanId?: EntityId
}

export type CreateTransactionInput = {
  type: TransactionType
  amount: number
  categoryId?: EntityId
  fromAccountId?: EntityId
  toAccountId?: EntityId
  date: IsoDateString
  time?: string
  transactionDateTime?: IsoDateTimeString
  notes?: string
  linkedBillId?: EntityId
  linkedGoalId?: EntityId
  linkedLoanId?: EntityId
}

export type UpdateTransactionInput = Partial<CreateTransactionInput>
