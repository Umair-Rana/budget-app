import type {
  Category,
  UpdateCategoryInput,
} from '@/data/models/category'
import type {
  CategoryInsertRow,
  CategoryRow,
  CategoryUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? 'Circle',
    color: row.color ?? '#64748b',
    isDefault: row.is_default,
    defaultKey: optional(row.default_key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseCategoryInsert(
  category: Category,
  context: SupabaseFinanceMapperContext,
): CategoryInsertRow {
  return {
    ...toSupabaseRecordFields(category, context),
    name: category.name,
    type: category.type,
    icon: nullable(category.icon),
    color: nullable(category.color),
    is_default: category.isDefault,
    default_key: nullable(category.defaultKey),
  }
}

export function toSupabaseCategoryUpdate(
  input: UpdateCategoryInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): CategoryUpdateRow {
  const update: CategoryUpdateRow = toSupabaseUpdateMetadata(context)

  if ('name' in input) {
    update.name = input.name
  }

  if ('type' in input) {
    update.type = input.type
  }

  if ('icon' in input) {
    update.icon = nullable(input.icon)
  }

  if ('color' in input) {
    update.color = nullable(input.color)
  }

  return update
}
