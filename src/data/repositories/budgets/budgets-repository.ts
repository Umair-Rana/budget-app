import { getFinanceDb } from '@/data/db/finance-db'
import type { BudgetsRepositoryContract } from '@/data/contracts/budgets-contract'
import type {
  BudgetAllocation,
  BudgetGroup,
  CreateBudgetAllocationInput,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import { createRecordId, createTimestamp } from '@/data/models/common'
import {
  RepositoryDuplicateRecordError,
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

const budgetGroups = ['needs', 'wants', 'savings', 'loans', 'custom'] as const

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function isBudgetGroup(group: string): group is BudgetGroup {
  return budgetGroups.includes(group as BudgetGroup)
}

function normalizeGroup(group: BudgetGroup | undefined) {
  if (!group) {
    return undefined
  }

  if (!isBudgetGroup(group)) {
    throw new RepositoryError('Budget group is not supported.')
  }

  return group
}

function isVisibleBudget(
  budget: BudgetAllocation,
  options?: RepositoryListOptions,
) {
  if (!options?.includeDeleted && budget.deletedAt) {
    return false
  }

  if (!options?.includeArchived && budget.archivedAt) {
    return false
  }

  return true
}

function assertMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new RepositoryError('Budget month is required.')
  }
}

function assertPlannedAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RepositoryError(
      'Budget planned amount must be greater than or equal to 0.',
    )
  }
}

function requireBudget(
  budget: BudgetAllocation | undefined,
  id: EntityId,
) {
  if (!budget) {
    throw new RepositoryRecordNotFoundError('Budget allocation', id)
  }

  return budget
}

function requireActiveExpenseCategory(category: Category | undefined) {
  if (!category || category.archivedAt || category.deletedAt) {
    throw new RepositoryError('Selected budget category is not available.')
  }

  if (category.type !== 'expense') {
    throw new RepositoryError('Budget category must be an expense category.')
  }

  return category
}

async function assertNoActiveDuplicate(
  month: string,
  categoryId: EntityId,
  excludeId?: EntityId,
) {
  const db = await getFinanceDb()
  const budgets = await db.getAllFromIndex('budgets', 'by-month-category', [
    month,
    categoryId,
  ])
  const duplicate = budgets.find(
    (budget) =>
      budget.id !== excludeId && !budget.archivedAt && !budget.deletedAt,
  )

  if (duplicate) {
    throw new RepositoryDuplicateRecordError(
      'Budget allocation',
      'month and category',
    )
  }
}

function normalizeCreateInput(
  input: CreateBudgetAllocationInput,
): CreateBudgetAllocationInput {
  return {
    month: input.month.trim(),
    categoryId: input.categoryId,
    plannedAmount: input.plannedAmount,
    group: normalizeGroup(input.group),
    notes: normalizeNotes(input.notes),
  }
}

function validateBudgetInput(input: CreateBudgetAllocationInput) {
  assertMonth(input.month)

  if (!input.categoryId) {
    throw new RepositoryError('Budget category is required.')
  }

  assertPlannedAmount(input.plannedAmount)
}

function createBudgetRecord(
  input: CreateBudgetAllocationInput,
): BudgetAllocation {
  const now = createTimestamp()
  const normalizedInput = normalizeCreateInput(input)

  return {
    id: createRecordId(),
    month: normalizedInput.month,
    categoryId: normalizedInput.categoryId,
    plannedAmount: normalizedInput.plannedAmount,
    group: normalizedInput.group,
    notes: normalizedInput.notes,
    createdAt: now,
    updatedAt: now,
  }
}

function mergeBudgetInput(
  current: BudgetAllocation,
  input: UpdateBudgetAllocationInput,
): CreateBudgetAllocationInput {
  return {
    month: input.month ?? current.month,
    categoryId: input.categoryId ?? current.categoryId,
    plannedAmount: input.plannedAmount ?? current.plannedAmount,
    group: 'group' in input ? input.group : current.group,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function updateBudgetRecord(
  current: BudgetAllocation,
  input: UpdateBudgetAllocationInput,
): BudgetAllocation {
  const mergedInput = normalizeCreateInput(mergeBudgetInput(current, input))

  return {
    ...current,
    month: mergedInput.month,
    categoryId: mergedInput.categoryId,
    plannedAmount: mergedInput.plannedAmount,
    group: mergedInput.group,
    notes: mergedInput.notes,
    updatedAt: createTimestamp(),
  }
}

export const budgetsRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const budgets = await db.getAll('budgets')

    return budgets.filter((budget) => isVisibleBudget(budget, options))
  },

  async getById(id: EntityId, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const budget = await db.get('budgets', id)

    if (!budget || !isVisibleBudget(budget, options)) {
      return undefined
    }

    return budget
  },

  async getByMonth(month: string, options?: RepositoryListOptions) {
    assertMonth(month)

    const db = await getFinanceDb()
    const budgets = await db.getAllFromIndex('budgets', 'by-month', month)

    return budgets.filter((budget) => isVisibleBudget(budget, options))
  },

  async create(input: CreateBudgetAllocationInput) {
    const budget = createBudgetRecord(input)

    validateBudgetInput(budget)
    await assertNoActiveDuplicate(budget.month, budget.categoryId)

    const db = await getFinanceDb()
    const category = await db.get('categories', budget.categoryId)

    requireActiveExpenseCategory(category)
    await db.add('budgets', budget)

    return budget
  },

  async update(id: EntityId, input: UpdateBudgetAllocationInput) {
    const db = await getFinanceDb()
    const current = requireBudget(await db.get('budgets', id), id)

    if (current.archivedAt || current.deletedAt) {
      throw new RepositoryError(
        'Archived or deleted budget allocations cannot be edited.',
      )
    }

    const updated = updateBudgetRecord(current, input)

    validateBudgetInput(updated)
    await assertNoActiveDuplicate(updated.month, updated.categoryId, id)

    const category = await db.get('categories', updated.categoryId)

    requireActiveExpenseCategory(category)
    await db.put('budgets', updated)

    return updated
  },

  async archive(id: EntityId) {
    const db = await getFinanceDb()
    const current = requireBudget(await db.get('budgets', id), id)
    const now = createTimestamp()
    const updated: BudgetAllocation = {
      ...current,
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await db.put('budgets', updated)

    return updated
  },

  async deleteSoft(id: EntityId) {
    const db = await getFinanceDb()
    const current = requireBudget(await db.get('budgets', id), id)
    const now = createTimestamp()
    const updated: BudgetAllocation = {
      ...current,
      deletedAt: current.deletedAt ?? now,
      updatedAt: now,
    }

    await db.put('budgets', updated)

    return updated
  },
} satisfies BudgetsRepositoryContract
