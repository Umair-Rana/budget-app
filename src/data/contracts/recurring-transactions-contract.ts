import type { EntityId, IsoDateString } from '@/data/models/common'
import type {
  CreateRecurringTransactionInput,
  GenerateRecurringTransactionsResult,
  RecurringTransaction,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface RecurringTransactionsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<RecurringTransaction[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<RecurringTransaction | undefined>
  getDue(asOfDate?: IsoDateString): Promise<RecurringTransaction[]>
  create(
    input: CreateRecurringTransactionInput,
  ): Promise<RecurringTransaction>
  update(
    id: EntityId,
    input: UpdateRecurringTransactionInput,
  ): Promise<RecurringTransaction>
  archive(id: EntityId): Promise<RecurringTransaction>
  deleteSoft(id: EntityId): Promise<RecurringTransaction>
  generateDue(asOfDate?: IsoDateString): Promise<GenerateRecurringTransactionsResult>
}
