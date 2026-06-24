import type { FinanceDataSource } from '@/data/contracts'

export type LocalSqliteSyncTriggerDataSource = FinanceDataSource & {
  syncPendingOperations?: () => Promise<unknown>
}

export async function triggerLocalSqliteSyncIfAvailable({
  dataSource,
  onSynced,
}: {
  dataSource: FinanceDataSource
  onSynced?: () => Promise<unknown> | unknown
}) {
  const syncPendingOperations = (
    dataSource as LocalSqliteSyncTriggerDataSource
  ).syncPendingOperations

  if (!syncPendingOperations) {
    return false
  }

  await syncPendingOperations()
  await onSynced?.()

  return true
}
