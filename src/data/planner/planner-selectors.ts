import type { BudgetAllocation, BudgetGroup } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { Transaction } from '@/data/models/transaction'
import { formatPkr } from '@/lib/formatting'

export type BudgetUsageStatus =
  | 'safe'
  | 'near-limit'
  | 'over-budget'
  | 'unplanned'

export type PlannerBudgetRow = {
  id: string
  allocation: BudgetAllocation
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  plannedAmount: number
  plannedAmountText: string
  actualAmount: number
  actualAmountText: string
  remainingAmount: number
  remainingAmountText: string
  usagePercent: number
  progressPercent: number
  status: BudgetUsageStatus
  statusLabel: string
  group?: BudgetGroup
  groupLabel?: string
  notes?: string
}

export type PlannerUnplannedSpendingRow = {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  actualAmount: number
  actualAmountText: string
}

export type PlannerSummary = {
  plannedTotal: number
  plannedTotalText: string
  actualTotal: number
  actualTotalText: string
  remainingTotal: number
  remainingTotalText: string
  overBudgetCount: number
  overBudgetCountText: string
  hasBudgetAllocations: boolean
  hasUnplannedSpending: boolean
}

export type PlannerWorkspaceData = {
  month: string
  monthLabel: string
  budgetRows: PlannerBudgetRow[]
  unplannedSpendingRows: PlannerUnplannedSpendingRow[]
  summary: PlannerSummary
  expenseCategories: Category[]
}

export type PlannerWorkspaceSourceData = {
  month: string
  budgets: BudgetAllocation[]
  categories: Category[]
  transactions: Transaction[]
}

const groupLabels: Record<BudgetGroup, string> = {
  custom: 'Custom',
  loans: 'Loans',
  needs: 'Needs',
  savings: 'Savings',
  wants: 'Wants',
}

const statusLabels: Record<BudgetUsageStatus, string> = {
  safe: 'Safe',
  'near-limit': 'Near Limit',
  'over-budget': 'Over Budget',
  unplanned: 'Unplanned',
}

export function getCurrentBudgetMonth(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function shiftBudgetMonth(month: string, monthDelta: number) {
  const [yearValue, monthValue] = month.split('-').map(Number)
  const nextDate = new Date(yearValue, monthValue - 1 + monthDelta, 1)
  const year = nextDate.getFullYear()
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')

  return `${year}-${nextMonth}`
}

export function formatBudgetMonth(month: string) {
  const [yearValue, monthValue] = month.split('-').map(Number)
  const date = new Date(yearValue, monthValue - 1, 1)

  return new Intl.DateTimeFormat('en-PK', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getBudgetGroupLabel(group: BudgetGroup) {
  return groupLabels[group]
}

export function getBudgetStatusLabel(status: BudgetUsageStatus) {
  return statusLabels[status]
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function isActiveRecord(record: { archivedAt?: string; deletedAt?: string }) {
  return !record.archivedAt && !record.deletedAt
}

function isActualBudgetExpense(transaction: Transaction, month: string) {
  return (
    transaction.type === 'expense' &&
    Boolean(transaction.categoryId) &&
    transaction.date.startsWith(month) &&
    !transaction.archivedAt &&
    !transaction.deletedAt &&
    !transaction.linkedGoalId &&
    !transaction.linkedLoanId
  )
}

function getActualSpendingByCategory(
  transactions: Transaction[],
  month: string,
) {
  const actualByCategory = new Map<string, number>()

  for (const transaction of transactions) {
    if (!isActualBudgetExpense(transaction, month) || !transaction.categoryId) {
      continue
    }

    actualByCategory.set(
      transaction.categoryId,
      (actualByCategory.get(transaction.categoryId) ?? 0) + transaction.amount,
    )
  }

  return actualByCategory
}

function getStatus(plannedAmount: number, actualAmount: number): BudgetUsageStatus {
  if (plannedAmount === 0 && actualAmount > 0) {
    return 'unplanned'
  }

  if (actualAmount > plannedAmount) {
    return 'over-budget'
  }

  if (plannedAmount > 0 && actualAmount / plannedAmount >= 0.75) {
    return 'near-limit'
  }

  return 'safe'
}

function getUsagePercent(plannedAmount: number, actualAmount: number) {
  if (plannedAmount <= 0) {
    return actualAmount > 0 ? 100 : 0
  }

  return Math.round((actualAmount / plannedAmount) * 100)
}

function fallbackCategory(categoryId: string) {
  return {
    color: '#64748b',
    icon: 'ellipsis',
    name: categoryId ? 'Unknown category' : 'No category',
  }
}

function categoryView(category: Category | undefined, categoryId: string) {
  return category ?? fallbackCategory(categoryId)
}

function sortBudgetRows(first: PlannerBudgetRow, second: PlannerBudgetRow) {
  if (first.status === 'over-budget' && second.status !== 'over-budget') {
    return -1
  }

  if (first.status !== 'over-budget' && second.status === 'over-budget') {
    return 1
  }

  return first.categoryName.localeCompare(second.categoryName)
}

export function getPlannerBudgetTotals(
  budgets: BudgetAllocation[],
  transactions: Transaction[],
  month: string,
) {
  const activeBudgets = budgets.filter(
    (budget) => budget.month === month && isActiveRecord(budget),
  )
  const actualByCategory = getActualSpendingByCategory(transactions, month)
  const plannedTotal = activeBudgets.reduce(
    (total, budget) => total + budget.plannedAmount,
    0,
  )
  const actualTotal = [...actualByCategory.values()].reduce(
    (total, actualAmount) => total + actualAmount,
    0,
  )

  return {
    actualTotal,
    hasBudgetAllocations: activeBudgets.length > 0,
    plannedTotal,
    remainingTotal: plannedTotal - actualTotal,
  }
}

export function createPlannerWorkspace({
  budgets,
  categories,
  month,
  transactions,
}: PlannerWorkspaceSourceData): PlannerWorkspaceData {
  const categoriesById = createRecordMap(categories)
  const activeBudgets = budgets.filter(
    (budget) => budget.month === month && isActiveRecord(budget),
  )
  const activeBudgetCategoryIds = new Set(
    activeBudgets.map((budget) => budget.categoryId),
  )
  const actualByCategory = getActualSpendingByCategory(transactions, month)
  const budgetRows = activeBudgets
    .map((budget) => {
      const category = categoryView(
        categoriesById.get(budget.categoryId),
        budget.categoryId,
      )
      const actualAmount = actualByCategory.get(budget.categoryId) ?? 0
      const remainingAmount = budget.plannedAmount - actualAmount
      const usagePercent = getUsagePercent(budget.plannedAmount, actualAmount)
      const status = getStatus(budget.plannedAmount, actualAmount)

      return {
        id: budget.id,
        allocation: budget,
        categoryId: budget.categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        plannedAmount: budget.plannedAmount,
        plannedAmountText: formatPkr(budget.plannedAmount),
        actualAmount,
        actualAmountText: formatPkr(actualAmount),
        remainingAmount,
        remainingAmountText: formatPkr(remainingAmount),
        usagePercent,
        progressPercent: Math.min(100, usagePercent),
        status,
        statusLabel: getBudgetStatusLabel(status),
        group: budget.group,
        groupLabel: budget.group ? getBudgetGroupLabel(budget.group) : undefined,
        notes: budget.notes,
      } satisfies PlannerBudgetRow
    })
    .sort(sortBudgetRows)

  const unplannedSpendingRows = [...actualByCategory.entries()]
    .filter(
      ([categoryId, actualAmount]) =>
        actualAmount > 0 && !activeBudgetCategoryIds.has(categoryId),
    )
    .map(([categoryId, actualAmount]) => {
      const category = categoryView(categoriesById.get(categoryId), categoryId)

      return {
        categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        actualAmount,
        actualAmountText: formatPkr(actualAmount),
      } satisfies PlannerUnplannedSpendingRow
    })
    .sort((first, second) => second.actualAmount - first.actualAmount)

  const plannedTotal = activeBudgets.reduce(
    (total, budget) => total + budget.plannedAmount,
    0,
  )
  const actualTotal = [...actualByCategory.values()].reduce(
    (total, actualAmount) => total + actualAmount,
    0,
  )
  const remainingTotal = plannedTotal - actualTotal
  const overBudgetCount = budgetRows.filter(
    (row) => row.status === 'over-budget',
  ).length

  return {
    month,
    monthLabel: formatBudgetMonth(month),
    budgetRows,
    unplannedSpendingRows,
    summary: {
      plannedTotal,
      plannedTotalText: formatPkr(plannedTotal),
      actualTotal,
      actualTotalText: formatPkr(actualTotal),
      remainingTotal,
      remainingTotalText: formatPkr(remainingTotal),
      overBudgetCount,
      overBudgetCountText: String(overBudgetCount),
      hasBudgetAllocations: activeBudgets.length > 0,
      hasUnplannedSpending: unplannedSpendingRows.length > 0,
    },
    expenseCategories: categories
      .filter(
        (category) => category.type === 'expense' && isActiveRecord(category),
      )
      .sort((first, second) => first.name.localeCompare(second.name)),
  }
}
