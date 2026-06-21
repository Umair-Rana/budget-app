import type {
  EntityId,
  FinanceRecord,
  IsoDateString,
} from '@/data/models/common'

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'upcoming'
export type BillFrequency = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Bill = FinanceRecord & {
  name: string
  amount: number
  categoryId: EntityId
  dueDate: IsoDateString
  status: BillStatus
  frequency: BillFrequency
  nextDueDate?: IsoDateString
  lastGeneratedDate?: IsoDateString
  paymentAccountId?: EntityId
  linkedTransactionId?: EntityId
  notes?: string
}

export type CreateBillInput = {
  name: string
  amount: number
  categoryId: EntityId
  dueDate: IsoDateString
  frequency: BillFrequency
  notes?: string
}

export type UpdateBillInput = Partial<CreateBillInput>

export type MarkBillPaidInput = {
  paymentAccountId: EntityId
  paymentDate: IsoDateString
  notes?: string
}
