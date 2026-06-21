import {
  createPlannerWorkspace,
  type PlannerWorkspaceData,
} from '@/data/planner/planner-selectors'
import type { FinanceDataSource } from '@/data/contracts'

export const plannerBaseQueryKey = ['planner'] as const

export function plannerMonthQueryKey(month: string) {
  return [...plannerBaseQueryKey, month] as const
}

export async function getPlannerWorkspace(
  month: string,
  dataSource: FinanceDataSource,
): Promise<PlannerWorkspaceData> {
  await dataSource.categories.seedDefaultsIfNeeded()

  const [budgets, categories, transactions] = await Promise.all([
    dataSource.budgets.getByMonth(month),
    dataSource.categories.getAll({ includeArchived: true }),
    dataSource.transactions.getAll(),
  ])

  return createPlannerWorkspace({
    budgets,
    categories,
    month,
    transactions,
  })
}
