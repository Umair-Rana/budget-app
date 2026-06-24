import type { RecurringTransactionsRepositoryContract } from '@/data/contracts/recurring-transactions-contract'
import type { IsoDateString } from '@/data/models/common'
import { fromLocalRecurringTransactionRow } from '@/data/local-sqlite/mappers'
import type { LocalRecurringTransactionRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalRecurringTransactionRepository(
  context: LocalSqliteRepositoryContext,
): RecurringTransactionsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    generateDue: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalRecurringTransactionRow>({
        context,
        options,
        orderBy: 'next_run_date',
        table: 'recurring_transactions',
      })
      return rows.map(fromLocalRecurringTransactionRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalRecurringTransactionRow>({
        context,
        id,
        options,
        table: 'recurring_transactions',
      })
      return row ? fromLocalRecurringTransactionRow(row) : undefined
    },
    async getDue(asOfDate: IsoDateString = new Date().toISOString().slice(0, 10)) {
      const rows = await context.driver.query<LocalRecurringTransactionRow>(
        [
          'select * from recurring_transactions',
          'where household_id = ?',
          'and deleted_at is null',
          'and archived_at is null',
          'and is_active = 1',
          'and next_run_date <= ?',
          'order by next_run_date',
        ].join(' '),
        [context.householdId, asOfDate],
      )
      return rows.map(fromLocalRecurringTransactionRow)
    },
    update: throwLocalSqliteWriteNotImplemented,
  }
}
