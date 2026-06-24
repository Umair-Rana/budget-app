import type { AccountsRepositoryContract } from '@/data/contracts/accounts-contract'
import { fromLocalAccountRow } from '@/data/local-sqlite/mappers'
import type { LocalAccountRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalAccountRepository(
  context: LocalSqliteRepositoryContext,
): AccountsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalAccountRow>({
        context,
        options,
        orderBy: 'name',
        table: 'accounts',
      })
      return rows.map(fromLocalAccountRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalAccountRow>({
        context,
        id,
        options,
        table: 'accounts',
      })
      return row ? fromLocalAccountRow(row) : undefined
    },
    update: throwLocalSqliteWriteNotImplemented,
  }
}
