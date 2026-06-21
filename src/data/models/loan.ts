import type {
  EntityId,
  FinanceRecord,
  IsoDateString,
} from '@/data/models/common'

export type LoanType = 'given' | 'taken'
export type LoanStatus =
  | 'active'
  | 'partially_paid'
  | 'completed'
  | 'overdue'
  | 'archived'

export type Loan = FinanceRecord & {
  name: string
  type: LoanType
  counterparty?: string
  principalAmount: number
  outstandingAmount: number
  interestRate?: number
  dueDate?: IsoDateString
  status: LoanStatus
  sourceAccountId?: EntityId
  receivingAccountId?: EntityId
  linkedTransactionId?: EntityId
  notes?: string
}

export type CreateLoanInput = {
  name: string
  type: LoanType
  counterparty?: string
  principalAmount: number
  interestRate?: number
  dueDate?: IsoDateString
  sourceAccountId?: EntityId
  receivingAccountId?: EntityId
  notes?: string
}

export type UpdateLoanInput = Partial<CreateLoanInput>

export type RecordLoanPaymentInput = {
  amount: number
  accountId: EntityId
  date: IsoDateString
  notes?: string
}
