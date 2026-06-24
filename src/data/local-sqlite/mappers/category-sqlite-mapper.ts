import type { Category } from '@/data/models/category'
import type { LocalCategoryRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  fromSqliteBoolean,
  nullable,
  optional,
  toLocalRecordRow,
  toSqliteBoolean,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalCategoryRow(row: LocalCategoryRow): Category {
  return {
    ...fromLocalRecordRow(row),
    color: row.color ?? '#64748b',
    defaultKey: optional(row.default_key),
    icon: row.icon ?? 'Circle',
    isDefault: fromSqliteBoolean(row.is_default),
    name: row.name,
    type: row.type,
  }
}

export function toLocalCategoryRow(
  category: Category,
  context: { householdId: string; userId?: string },
): LocalCategoryRow {
  return {
    ...toLocalRecordRow(category, context),
    color: nullable(category.color),
    default_key: nullable(category.defaultKey),
    icon: nullable(category.icon),
    is_default: toSqliteBoolean(category.isDefault),
    name: category.name,
    type: category.type,
  }
}
