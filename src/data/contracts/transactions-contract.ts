import type { EntityId } from '@/data/models/common'
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface TransactionsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Transaction[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Transaction | undefined>
  getByType(
    type: TransactionType,
    options?: RepositoryListOptions,
  ): Promise<Transaction[]>
  create(input: CreateTransactionInput): Promise<Transaction>
  update(id: EntityId, input: UpdateTransactionInput): Promise<Transaction>
  archive(id: EntityId): Promise<Transaction>
  deleteSoft(id: EntityId): Promise<Transaction>
}
