import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/data/models/account'
import type { EntityId } from '@/data/models/common'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface AccountsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Account[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Account | undefined>
  create(input: CreateAccountInput): Promise<Account>
  update(id: EntityId, input: UpdateAccountInput): Promise<Account>
  archive(id: EntityId): Promise<Account>
  deleteSoft(id: EntityId): Promise<Account>
}
