import { getFinanceDb } from '@/data/db/finance-db'
import type { CategoriesRepositoryContract } from '@/data/contracts/categories-contract'
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
import {
  defaultCategories,
  type DefaultCategorySeed,
} from '@/data/seed/default-categories'

const defaultCategoriesSeedKey = 'default-categories-seeded-v1'

function isVisibleCategory(category: Category, options?: RepositoryListOptions) {
  if (!options?.includeDeleted && category.deletedAt) {
    return false
  }

  if (!options?.includeArchived && category.archivedAt) {
    return false
  }

  return true
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

async function requireCategory(id: string) {
  const category = await categoriesRepository.getById(id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!category) {
    throw new RepositoryRecordNotFoundError('Category', id)
  }

  return category
}

async function assertNoActiveDuplicate(
  input: Pick<Category, 'name' | 'type'>,
  excludeId?: string,
) {
  const db = await getFinanceDb()
  const categories = await db.getAll('categories')
  const identity = categoryIdentity(input)
  const duplicate = categories.find(
    (category) =>
      category.id !== excludeId &&
      !category.archivedAt &&
      !category.deletedAt &&
      categoryIdentity(category) === identity,
  )

  if (duplicate) {
    throw new RepositoryDuplicateRecordError('Category', 'name and type')
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

function findExistingDefaultCategory(
  categories: Category[],
  defaultCategory: DefaultCategorySeed,
) {
  const existingByDefaultKey = categories.find(
    (category) => category.defaultKey === defaultCategory.defaultKey,
  )

  if (existingByDefaultKey) {
    return existingByDefaultKey
  }

  return categories.find(
    (category) =>
      !category.defaultKey &&
      categoryIdentity(category) === categoryIdentity(defaultCategory),
  )
}

export const categoriesRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const categories = await db.getAll('categories')

    return categories.filter((category) => isVisibleCategory(category, options))
  },

  async getById(id: string, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const category = await db.get('categories', id)

    if (!category || !isVisibleCategory(category, options)) {
      return undefined
    }

    return category
  },

  async getByType(type: CategoryType, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const categories = await db.getAllFromIndex('categories', 'by-type', type)

    return categories.filter((category) => isVisibleCategory(category, options))
  },

  async create(input: CreateCategoryInput) {
    const db = await getFinanceDb()
    const normalizedInput = normalizeCreateInput(input)

    await assertNoActiveDuplicate(normalizedInput)

    const category = createCategoryRecord(normalizedInput)

    await db.add('categories', category)

    return category
  },

  async update(id: string, input: UpdateCategoryInput) {
    const db = await getFinanceDb()
    const current = await requireCategory(id)
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

    await assertNoActiveDuplicate(nextIdentity, id)

    const updated: Category = {
      ...current,
      ...normalizedInput,
      type: current.isDefault
        ? current.type
        : normalizedInput.type ?? current.type,
      isDefault: current.isDefault,
      defaultKey: current.defaultKey,
      updatedAt: createTimestamp(),
    }

    await db.put('categories', updated)

    return updated
  },

  async archive(id: string) {
    const db = await getFinanceDb()
    const current = await requireCategory(id)
    const now = createTimestamp()
    const updated: Category = {
      ...current,
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await db.put('categories', updated)

    return updated
  },

  async deleteSoft(id: string) {
    const db = await getFinanceDb()
    const current = await requireCategory(id)
    const now = createTimestamp()
    const updated: Category = {
      ...current,
      deletedAt: current.deletedAt ?? now,
      updatedAt: now,
    }

    await db.put('categories', updated)

    return updated
  },

  async seedDefaultsIfNeeded() {
    const db = await getFinanceDb()
    const transaction = db.transaction(['categories', 'metadata'], 'readwrite')
    const categoryStore = transaction.objectStore('categories')
    const metadataStore = transaction.objectStore('metadata')
    const existingCategories = await categoryStore.getAll()
    const now = createTimestamp()
    let createdCount = 0
    let updatedCount = 0

    for (const defaultCategory of defaultCategories) {
      const existingCategory = findExistingDefaultCategory(
        existingCategories,
        defaultCategory,
      )

      if (existingCategory) {
        if (
          !existingCategory.isDefault ||
          existingCategory.defaultKey !== defaultCategory.defaultKey
        ) {
          await categoryStore.put({
            ...existingCategory,
            isDefault: true,
            defaultKey: defaultCategory.defaultKey,
            updatedAt: now,
          })
          updatedCount += 1
        }
      } else {
        await categoryStore.add(
          createCategoryRecord(defaultCategory, {
            isDefault: true,
            defaultKey: defaultCategory.defaultKey,
          }),
        )
        createdCount += 1
      }
    }

    await metadataStore.put({
      key: defaultCategoriesSeedKey,
      value: now,
      updatedAt: now,
    })

    await transaction.done

    return {
      seeded: createdCount > 0 || updatedCount > 0,
      createdCount,
      updatedCount,
    }
  },
} satisfies CategoriesRepositoryContract
