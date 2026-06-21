import {
  createMonthlyReport,
  type MonthlyReportData,
  type MonthlyReportSourceData,
} from '@/data/reports/reports-selectors'
import type { FinanceDataSource } from '@/data/contracts'

export const reportsBaseQueryKey = ['reports'] as const

export function monthlyReportQueryKey(month: string) {
  return [...reportsBaseQueryKey, month] as const
}

export async function getMonthlyReportSourceData(
  dataSource: FinanceDataSource,
): Promise<MonthlyReportSourceData> {
  await dataSource.categories.seedDefaultsIfNeeded()

  const [accounts, bills, budgets, categories, goals, loans, transactions] =
    await Promise.all([
      dataSource.accounts.getAll({ includeArchived: true }),
      dataSource.bills.getAll({ includeArchived: true }),
      dataSource.budgets.getAll({ includeArchived: true }),
      dataSource.categories.getAll({ includeArchived: true }),
      dataSource.goals.getAll({ includeArchived: true }),
      dataSource.loans.getAll({ includeArchived: true }),
      dataSource.transactions.getAll({ includeArchived: true }),
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

export async function getMonthlyReport(
  month: string,
  dataSource: FinanceDataSource,
): Promise<MonthlyReportData> {
  return createMonthlyReport(await getMonthlyReportSourceData(dataSource), month)
}
