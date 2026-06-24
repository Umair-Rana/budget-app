import type { FinanceDataSource } from '@/data/contracts'
import { hydrateSupabaseToLocalSqlite } from '@/data/local-sqlite/hydration'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import {
  listReplayableLocalOperations,
  markLocalOperationFailed,
  markLocalOperationSynced,
  markLocalOperationSyncing,
} from '@/data/local-sqlite/sync/operation-queue-repository'
import { replayLocalTransactionCreateOperation } from '@/data/local-sqlite/sync/transaction-operation-replay'
import {
  createEmptyLocalSyncPendingOperationsResult,
  getLocalSyncErrorMessage,
  type LocalSyncPendingOperationsResult,
} from '@/data/local-sqlite/sync/sync-result'

const activeHouseholdSyncs = new Map<string, Promise<LocalSyncPendingOperationsResult>>()

function getNextRetryAt(now: Date) {
  return new Date(now.getTime() + 60_000).toISOString()
}

async function syncPendingOperationsOnce({
  driver,
  householdId,
  hydrateLocalSqlite = hydrateSupabaseToLocalSqlite,
  now = () => new Date(),
  supabaseDataSource,
  userId,
}: SyncPendingLocalSqliteOperationsInput): Promise<LocalSyncPendingOperationsResult> {
  const startedAt = now()
  const operations = await listReplayableLocalOperations({
    driver,
    householdId,
    now: startedAt.toISOString(),
  })
  const result = createEmptyLocalSyncPendingOperationsResult()

  result.totalCount = operations.length

  if (operations.length === 0) {
    return result
  }

  for (const operation of operations) {
    const attemptStartedAt = now()

    try {
      await markLocalOperationSyncing({
        driver,
        id: operation.id,
        now: attemptStartedAt.toISOString(),
      })
      await replayLocalTransactionCreateOperation({
        operation,
        supabaseDataSource,
      })
      await markLocalOperationSynced({
        driver,
        id: operation.id,
        now: now().toISOString(),
      })
      result.syncedCount += 1
    } catch (error) {
      await markLocalOperationFailed({
        driver,
        errorMessage: getLocalSyncErrorMessage(error),
        id: operation.id,
        nextRetryAt: getNextRetryAt(now()),
        now: now().toISOString(),
      })
      result.failedCount += 1
    }
  }

  if (result.syncedCount > 0) {
    const hydrationResult = await hydrateLocalSqlite({
      dataSource: supabaseDataSource,
      householdId,
      localDriver: driver,
      userId: userId ?? undefined,
    })

    if (hydrationResult.errors.length > 0) {
      result.failedCount += 1
    }
  }

  return result
}

export type SyncPendingLocalSqliteOperationsInput = {
  driver: LocalSqliteDriver
  householdId: string
  hydrateLocalSqlite?: typeof hydrateSupabaseToLocalSqlite
  now?: () => Date
  supabaseDataSource: FinanceDataSource
  userId?: string | null
}

export function syncPendingLocalSqliteOperations(
  input: SyncPendingLocalSqliteOperationsInput,
) {
  const existingSync = activeHouseholdSyncs.get(input.householdId)

  if (existingSync) {
    return existingSync
  }

  const nextSync = syncPendingOperationsOnce(input).finally(() => {
    activeHouseholdSyncs.delete(input.householdId)
  })

  activeHouseholdSyncs.set(input.householdId, nextSync)

  return nextSync
}

export function getActiveLocalSqliteSyncCount() {
  return activeHouseholdSyncs.size
}
