import type { TransactionsRepositoryContract } from '@/data/contracts/transactions-contract'
import type { TransactionType } from '@/data/models/transaction'
import { fromLocalTransactionRow } from '@/data/local-sqlite/mappers'
import type { LocalTransactionRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  visibilityWhereClause,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalTransactionRepository(
  context: LocalSqliteRepositoryContext,
): TransactionsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalTransactionRow>({
        context,
        options,
        orderBy: 'date desc, time desc',
        table: 'transactions',
      })
      return rows.map(fromLocalTransactionRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalTransactionRow>({
        context,
        id,
        options,
        table: 'transactions',
      })
      return row ? fromLocalTransactionRow(row) : undefined
    },
    async getByType(type: TransactionType, options?: RepositoryListOptions) {
      const clauses = [
        'household_id = ?',
        'type = ?',
        ...visibilityWhereClause(options),
      ]
      const rows = await context.driver.query<LocalTransactionRow>(
        `select * from transactions where ${clauses.join(' and ')} order by date desc, time desc`,
        [context.householdId, type],
      )
      return rows.map(fromLocalTransactionRow)
    },
    update: throwLocalSqliteWriteNotImplemented,
  }
}
