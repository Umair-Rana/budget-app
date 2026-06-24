import type { BudgetsRepositoryContract } from '@/data/contracts/budgets-contract'
import { fromLocalBudgetRow } from '@/data/local-sqlite/mappers'
import type { LocalBudgetRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  visibilityWhereClause,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalBudgetRepository(
  context: LocalSqliteRepositoryContext,
): BudgetsRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalBudgetRow>({
        context,
        options,
        orderBy: 'month desc',
        table: 'budgets',
      })
      return rows.map(fromLocalBudgetRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalBudgetRow>({
        context,
        id,
        options,
        table: 'budgets',
      })
      return row ? fromLocalBudgetRow(row) : undefined
    },
    async getByMonth(month: string, options?: RepositoryListOptions) {
      const clauses = [
        'household_id = ?',
        'month = ?',
        ...visibilityWhereClause(options),
      ]
      const rows = await context.driver.query<LocalBudgetRow>(
        `select * from budgets where ${clauses.join(' and ')} order by category_id`,
        [context.householdId, month],
      )
      return rows.map(fromLocalBudgetRow)
    },
    update: throwLocalSqliteWriteNotImplemented,
  }
}
