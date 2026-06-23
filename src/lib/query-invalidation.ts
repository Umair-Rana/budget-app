import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const financeQueryKeys = {
  accounts: ['accounts'],
  bills: ['bills'],
  dashboard: ['dashboard'],
  goals: ['goals'],
  loans: ['loans'],
  notifications: ['notifications'],
  planner: ['planner'],
  recurringBills: ['recurring-bills'],
  recurringTransactions: ['recurring-transactions'],
  reports: ['reports'],
  transactions: ['transactions'],
} as const satisfies Record<string, QueryKey>

async function invalidateFinanceQueryKeys(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
) {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
    ),
  )
}

export async function invalidateAccountMutationData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.bills,
    financeQueryKeys.dashboard,
    financeQueryKeys.goals,
    financeQueryKeys.loans,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.recurringTransactions,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateTransactionMutationData(
  queryClient: QueryClient,
) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.dashboard,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateBillMutationData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.bills,
    financeQueryKeys.dashboard,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateGoalMutationData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.dashboard,
    financeQueryKeys.goals,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateLoanMutationData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.dashboard,
    financeQueryKeys.loans,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateBudgetMutationData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.dashboard,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.reports,
  ])
}

export async function invalidateRecurringTransactionScheduleData(
  queryClient: QueryClient,
) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.notifications,
    financeQueryKeys.recurringTransactions,
  ])
}

export async function invalidateRecurringTransactionGenerationData(
  queryClient: QueryClient,
) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.accounts,
    financeQueryKeys.dashboard,
    financeQueryKeys.notifications,
    financeQueryKeys.planner,
    financeQueryKeys.recurringTransactions,
    financeQueryKeys.reports,
    financeQueryKeys.transactions,
  ])
}

export async function invalidateRecurringBillData(queryClient: QueryClient) {
  await invalidateFinanceQueryKeys(queryClient, [
    financeQueryKeys.bills,
    financeQueryKeys.dashboard,
    financeQueryKeys.notifications,
    financeQueryKeys.recurringBills,
    financeQueryKeys.reports,
  ])
}
