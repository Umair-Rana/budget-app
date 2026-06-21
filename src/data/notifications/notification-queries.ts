import type { FinanceDataSource } from '@/data/contracts'
import {
  createNotifications,
  type NotificationSourceData,
} from '@/data/notifications/notification-selectors'
import {
  createNotificationSummary,
  type NotificationSummary,
} from '@/data/notifications/notification-summary'

export const notificationsQueryKey = ['notifications'] as const

export async function getNotificationSourceData(
  dataSource: FinanceDataSource,
): Promise<NotificationSourceData> {
  await dataSource.categories.seedDefaultsIfNeeded()

  const [
    bills,
    budgets,
    categories,
    goals,
    loans,
    recurringTransactions,
    transactions,
  ] = await Promise.all([
    dataSource.bills.getAll(),
    dataSource.budgets.getAll(),
    dataSource.categories.getAll({ includeArchived: true }),
    dataSource.goals.getAll(),
    dataSource.loans.getAll(),
    dataSource.recurringTransactions.getAll({ includeArchived: true }),
    dataSource.transactions.getAll(),
  ])

  return {
    bills,
    budgets,
    categories,
    goals,
    loans,
    recurringTransactions,
    transactions,
  }
}

export async function getNotificationSummary(
  dataSource: FinanceDataSource,
  now = new Date(),
): Promise<NotificationSummary> {
  return createNotificationSummary(
    createNotifications(await getNotificationSourceData(dataSource), now),
  )
}
