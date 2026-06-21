import type { EntityId } from '@/data/models/common'
import type {
  CreateLoanInput,
  Loan,
  RecordLoanPaymentInput,
  UpdateLoanInput,
} from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export type LoanPaymentResult = {
  loan: Loan
  transaction: Transaction
}

export interface LoansRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Loan[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Loan | undefined>
  create(input: CreateLoanInput): Promise<Loan>
  update(id: EntityId, input: UpdateLoanInput): Promise<Loan>
  archive(id: EntityId): Promise<Loan>
  deleteSoft(id: EntityId): Promise<Loan>
  recordPayment(
    id: EntityId,
    input: RecordLoanPaymentInput,
  ): Promise<LoanPaymentResult>
}
