import type { RecurringBillsRepositoryContract } from '@/data/contracts/recurring-bills-contract'
import type { IsoDateString } from '@/data/models/common'
import { fromLocalRecurringBillRow } from '@/data/local-sqlite/mappers'
import type { LocalRecurringBillRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalRecurringBillRepository(
  context: LocalSqliteRepositoryContext,
): RecurringBillsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    generateDue: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalRecurringBillRow>({
        context,
        options,
        orderBy: 'next_due_date',
        table: 'recurring_bills',
      })
      return rows.map(fromLocalRecurringBillRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalRecurringBillRow>({
        context,
        id,
        options,
        table: 'recurring_bills',
      })
      return row ? fromLocalRecurringBillRow(row) : undefined
    },
    async getDue(asOfDate: IsoDateString = new Date().toISOString().slice(0, 10)) {
      const rows = await context.driver.query<LocalRecurringBillRow>(
        [
          'select * from recurring_bills',
          'where household_id = ?',
          'and deleted_at is null',
          'and archived_at is null',
          'and is_active = 1',
          'and next_due_date <= ?',
          'order by next_due_date',
        ].join(' '),
        [context.householdId, asOfDate],
      )
      return rows.map(fromLocalRecurringBillRow)
    },
    update: throwLocalSqliteWriteNotImplemented,
  }
}
