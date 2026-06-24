import type { BillsRepositoryContract } from '@/data/contracts/bills-contract'
import { fromLocalBillRow } from '@/data/local-sqlite/mappers'
import type { LocalBillRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalBillRepository(
  context: LocalSqliteRepositoryContext,
): BillsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalBillRow>({
        context,
        options,
        orderBy: 'due_date',
        table: 'bills',
      })
      return rows.map(fromLocalBillRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalBillRow>({
        context,
        id,
        options,
        table: 'bills',
      })
      return row ? fromLocalBillRow(row) : undefined
    },
    markPaid: throwLocalSqliteWriteNotImplemented,
    markUnpaid: throwLocalSqliteWriteNotImplemented,
    update: throwLocalSqliteWriteNotImplemented,
  }
}
