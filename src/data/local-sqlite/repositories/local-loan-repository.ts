import type { LoansRepositoryContract } from '@/data/contracts/loans-contract'
import { fromLocalLoanRow } from '@/data/local-sqlite/mappers'
import type { LocalLoanRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalLoanRepository(
  context: LocalSqliteRepositoryContext,
): LoansRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalLoanRow>({
        context,
        options,
        orderBy: 'created_at',
        table: 'loans',
      })
      return rows.map(fromLocalLoanRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalLoanRow>({
        context,
        id,
        options,
        table: 'loans',
      })
      return row ? fromLocalLoanRow(row) : undefined
    },
    recordPayment: throwLocalSqliteWriteNotImplemented,
    update: throwLocalSqliteWriteNotImplemented,
  }
}
