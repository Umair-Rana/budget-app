export type LocalOperationQueueStatus =
  | 'failed'
  | 'pending'
  | 'syncing'
  | 'synced'

export type LocalTransactionCreateOperationType =
  | 'CREATE_EXPENSE_TRANSACTION'
  | 'CREATE_INCOME_TRANSACTION'

export type LocalOperationQueueEntityType = 'transaction'

export type LocalSyncPendingOperationsResult = {
  failedCount: number
  skippedCount: number
  syncedCount: number
  totalCount: number
}

export function createEmptyLocalSyncPendingOperationsResult(): LocalSyncPendingOperationsResult {
  return {
    failedCount: 0,
    skippedCount: 0,
    syncedCount: 0,
    totalCount: 0,
  }
}

export function getLocalSyncErrorMessage(error: unknown) {
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

  return 'Local operation sync failed.'
}
