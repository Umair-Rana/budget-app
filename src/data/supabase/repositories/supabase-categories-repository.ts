import type {
  CategoriesRepositoryContract,
  SeedDefaultCategoriesResult,
} from '@/data/contracts'
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/data/models/category'
import { createRecordId, createTimestamp } from '@/data/models/common'
import {
  RepositoryDuplicateRecordError,
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import { defaultCategories } from '@/data/seed/default-categories'
import {
  fromSupabaseCategoryRow,
  toSupabaseCategoryInsert,
  toSupabaseCategoryUpdate,
} from '@/data/supabase/mappers/category-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import {
  isSupabaseUniqueConstraintError,
  throwSupabaseRepositoryError,
} from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type { CategoryRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type CategoryTableRow = Database['public']['Tables']['categories']['Row']
type CategoryTableInsert = Database['public']['Tables']['categories']['Insert']
type CategoryTableUpdate = Database['public']['Tables']['categories']['Update']

function mapCategoryRow(row: CategoryTableRow): Category {
  return fromSupabaseCategoryRow(row as CategoryRow)
}

function categoryIdentity(category: Pick<Category, 'name' | 'type'>) {
  return `${category.type}:${category.name.trim().toLowerCase()}`
}

function normalizeCreateInput(input: CreateCategoryInput): CreateCategoryInput {
  return {
    name: input.name.trim(),
    type: input.type,
    icon: input.icon.trim(),
    color: input.color.trim(),
  }
}

function normalizeUpdateInput(input: UpdateCategoryInput): UpdateCategoryInput {
  return {
    ...input,
    name: input.name?.trim(),
    icon: input.icon?.trim(),
    color: input.color?.trim(),
  }
}

function createCategoryRecord(
  input: CreateCategoryInput,
  options?: {
    isDefault?: boolean
    defaultKey?: string
  },
): Category {
  const now = createTimestamp()
  const normalizedInput = normalizeCreateInput(input)

  return {
    id: createRecordId(),
    name: normalizedInput.name,
    type: normalizedInput.type,
    icon: normalizedInput.icon,
    color: normalizedInput.color,
    isDefault: options?.isDefault ?? false,
    defaultKey: options?.defaultKey,
    createdAt: now,
    updatedAt: now,
  }
}

async function getSupabaseCategoryById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('categories')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('id', id)

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null)
  }

  if (!options?.includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throwSupabaseRepositoryError('categories.getById', error)
  }

  return data ? mapCategoryRow(data) : undefined
}

async function requireSupabaseCategory(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const category = await getSupabaseCategoryById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!category) {
    throw new RepositoryRecordNotFoundError('Category', id)
  }

  return category
}

async function assertNoActiveDuplicate(
  context: SupabaseFinanceRepositoryContext,
  input: Pick<Category, 'name' | 'type'>,
  excludeId?: string,
) {
  const { data, error } = await context.client
    .from('categories')
    .select('id, name, type')
    .eq('household_id', context.householdId)
    .eq('type', input.type)
    .is('deleted_at', null)
    .is('archived_at', null)

  if (error) {
    throwSupabaseRepositoryError('categories.duplicateCheck', error)
  }

  const identity = categoryIdentity(input)
  const duplicate = (data ?? []).find(
    (category) =>
      category.id !== excludeId &&
      categoryIdentity({
        name: category.name,
        type: category.type as CategoryType,
      }) === identity,
  )

  if (duplicate) {
    throw new RepositoryDuplicateRecordError('Category', 'name and type')
  }
}

function handleSupabaseCategoryWriteError(operation: string, error: unknown) {
  if (isSupabaseUniqueConstraintError(error)) {
    throw new RepositoryDuplicateRecordError('Category', 'name and type')
  }

  throwSupabaseRepositoryError(operation, error)
}

export const supabaseCategoriesRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getByType() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async create() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async update() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async archive() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async deleteSoft() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async seedDefaultsIfNeeded() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies CategoriesRepositoryContract

export function createSupabaseCategoriesRepository(
  input: SupabaseFinanceRepositoryContextInput,
): CategoriesRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('categories')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query.order('type').order('name')

      if (error) {
        throwSupabaseRepositoryError('categories.getAll', error)
      }

      return (data ?? []).map(mapCategoryRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseCategoryById(context, id, options)
    },

    async getByType(type: CategoryType, options?: RepositoryListOptions) {
      let query = context.client
        .from('categories')
        .select('*')
        .eq('household_id', context.householdId)
        .eq('type', type)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('categories.getByType', error)
      }

      return (data ?? []).map(mapCategoryRow)
    },

    async create(input: CreateCategoryInput) {
      const normalizedInput = normalizeCreateInput(input)

      await assertNoActiveDuplicate(context, normalizedInput)

      const category = createCategoryRecord(normalizedInput)
      const insert = toSupabaseCategoryInsert(category, {
        householdId: context.householdId,
        userId: context.userId,
      }) as CategoryTableInsert

      const { data, error } = await context.client
        .from('categories')
        .insert(insert)
        .select()
        .single()

      if (error) {
        handleSupabaseCategoryWriteError('categories.create', error)
      }

      if (!data) {
        throwSupabaseRepositoryError('categories.create', {
          message: 'No category row was returned.',
        })
      }

      return mapCategoryRow(data)
    },

    async update(id: string, input: UpdateCategoryInput) {
      const current = await requireSupabaseCategory(context, id)
      const normalizedInput = normalizeUpdateInput(input)

      if (
        current.isDefault &&
        normalizedInput.type &&
        normalizedInput.type !== current.type
      ) {
        throw new RepositoryError('Default category type cannot be changed.')
      }

      const nextIdentity = {
        name: normalizedInput.name ?? current.name,
        type: normalizedInput.type ?? current.type,
      }

      await assertNoActiveDuplicate(context, nextIdentity, id)

      const update = toSupabaseCategoryUpdate(
        {
          ...normalizedInput,
          type: current.isDefault
            ? current.type
            : normalizedInput.type ?? current.type,
        },
        {
          userId: context.userId,
          now: createTimestamp(),
        },
      ) as CategoryTableUpdate

      const { data, error } = await context.client
        .from('categories')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        handleSupabaseCategoryWriteError('categories.update', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Category', id)
      }

      return mapCategoryRow(data)
    },

    async archive(id: string) {
      const current = await requireSupabaseCategory(context, id)
      const now = createTimestamp()
      const update: CategoryTableUpdate = {
        archived_at: current.archivedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('categories')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('categories.archive', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Category', id)
      }

      return mapCategoryRow(data)
    },

    async deleteSoft(id: string) {
      const current = await requireSupabaseCategory(context, id)
      const now = createTimestamp()
      const update: CategoryTableUpdate = {
        deleted_at: current.deletedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('categories')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('categories.deleteSoft', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Category', id)
      }

      return mapCategoryRow(data)
    },

    async seedDefaultsIfNeeded(): Promise<SeedDefaultCategoriesResult> {
      const { data: existingDefaults, error: existingDefaultsError } =
        await context.client
          .from('categories')
          .select('id')
          .eq('household_id', context.householdId)
          .eq('is_default', true)
          .is('deleted_at', null)
          .limit(1)

      if (existingDefaultsError) {
        throwSupabaseRepositoryError(
          'categories.seedDefaultsIfNeeded',
          existingDefaultsError,
        )
      }

      if ((existingDefaults ?? []).length > 0) {
        return {
          seeded: false,
          createdCount: 0,
          updatedCount: 0,
        }
      }

      const rows = defaultCategories.map((defaultCategory) => {
        const category = createCategoryRecord(defaultCategory, {
          isDefault: true,
          defaultKey: defaultCategory.defaultKey,
        })

        return toSupabaseCategoryInsert(category, {
          householdId: context.householdId,
          userId: context.userId,
        }) as CategoryTableInsert
      })

      const { error } = await context.client.from('categories').insert(rows)

      if (error) {
        handleSupabaseCategoryWriteError(
          'categories.seedDefaultsIfNeeded',
          error,
        )
      }

      return {
        seeded: rows.length > 0,
        createdCount: rows.length,
        updatedCount: 0,
      }
    },
  }
}
