import type {
  LocalHydrationResult,
  LocalHydrationTableCounts,
} from '@/data/local-sqlite/hydration/local-hydration-types'

export function createEmptyLocalHydrationTableCounts(): LocalHydrationTableCounts {
  return {
    accounts: 0,
    bills: 0,
    budgets: 0,
    categories: 0,
    goals: 0,
    householdMembers: 0,
    households: 0,
    loans: 0,
    notifications: 0,
    recurringBills: 0,
    recurringTransactions: 0,
    transactions: 0,
  }
}

export function createLocalHydrationResult({
  completedAt,
  errors = [],
  householdId,
  startedAt,
  tables = createEmptyLocalHydrationTableCounts(),
}: {
  completedAt: string
  errors?: string[]
  householdId: string
  startedAt: string
  tables?: LocalHydrationTableCounts
}): LocalHydrationResult {
  return {
    completedAt,
    errors,
    householdId,
    startedAt,
    tables,
  }
}

export function getLocalHydrationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Local SQLite hydration failed.'
}
