import type { CategoriesRepositoryContract } from '@/data/contracts/categories-contract'
import type { CategoryType } from '@/data/models/category'
import { fromLocalCategoryRow } from '@/data/local-sqlite/mappers'
import type { LocalCategoryRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  getLocalRowById,
  listLocalRows,
  throwLocalSqliteWriteNotImplemented,
  visibilityWhereClause,
  type LocalSqliteRepositoryContext,
} from '@/data/local-sqlite/repositories/local-repository-utils'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export function createLocalCategoryRepository(
  context: LocalSqliteRepositoryContext,
): CategoriesRepositoryContract {
  return {
    archive: throwLocalSqliteWriteNotImplemented,
    create: throwLocalSqliteWriteNotImplemented,
    deleteSoft: throwLocalSqliteWriteNotImplemented,
    async getAll(options?: RepositoryListOptions) {
      const rows = await listLocalRows<LocalCategoryRow>({
        context,
        options,
        orderBy: 'name',
        table: 'categories',
      })
      return rows.map(fromLocalCategoryRow)
    },
    async getById(id, options?: RepositoryListOptions) {
      const row = await getLocalRowById<LocalCategoryRow>({
        context,
        id,
        options,
        table: 'categories',
      })
      return row ? fromLocalCategoryRow(row) : undefined
    },
    async getByType(type: CategoryType, options?: RepositoryListOptions) {
      const clauses = [
        'household_id = ?',
        'type = ?',
        ...visibilityWhereClause(options),
      ]
      const rows = await context.driver.query<LocalCategoryRow>(
        `select * from categories where ${clauses.join(' and ')} order by name`,
        [context.householdId, type],
      )
      return rows.map(fromLocalCategoryRow)
    },
    seedDefaultsIfNeeded: throwLocalSqliteWriteNotImplemented,
    update: throwLocalSqliteWriteNotImplemented,
  }
}
