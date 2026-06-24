import type { GoalsRepositoryContract } from '@/data/contracts/goals-contract'
import { fromLocalGoalRow } from '@/data/local-sqlite/mappers'
import type { LocalGoalRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalGoalRepository(
  context: LocalSqliteRepositoryContext,
): GoalsRepositoryContract {
  return {
    addContribution: throwLocalSqliteWriteNotImplemented,
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalGoalRow>({
        context,
        options,
        orderBy: 'created_at',
        table: 'goals',
      })
      return rows.map(fromLocalGoalRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalGoalRow>({
        context,
        id,
        options,
        table: 'goals',
      })
      return row ? fromLocalGoalRow(row) : undefined
    },
    update: throwLocalSqliteWriteNotImplemented,
    withdraw: throwLocalSqliteWriteNotImplemented,
  }
}
