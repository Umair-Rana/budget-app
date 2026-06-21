import {
  createOverviewDashboard,
  type OverviewDashboardData,
  type OverviewDashboardSourceData,
} from '@/data/dashboard/dashboard-summary'
import type { FinanceDataSource } from '@/data/contracts'

export const overviewDashboardQueryKey = ['dashboard', 'overview'] as const

export async function getOverviewDashboardSourceData(
  dataSource: FinanceDataSource,
): Promise<OverviewDashboardSourceData> {
  await dataSource.categories.seedDefaultsIfNeeded()

  const [accounts, bills, budgets, categories, goals, loans, transactions] =
    await Promise.all([
      dataSource.accounts.getAll({ includeArchived: true }),
      dataSource.bills.getAll(),
      dataSource.budgets.getAll(),
      dataSource.categories.getAll({ includeArchived: true }),
      dataSource.goals.getAll(),
      dataSource.loans.getAll(),
      dataSource.transactions.getAll(),
    ])

  return {
    accounts,
    bills,
    budgets,
    categories,
    goals,
    loans,
    transactions,
  }
}

export async function getOverviewDashboard(
  dataSource: FinanceDataSource,
): Promise<OverviewDashboardData> {
  return createOverviewDashboard(await getOverviewDashboardSourceData(dataSource))
}
