import { describe, expect, it, vi } from 'vitest'

import type { FinanceDataSource } from '@/data/contracts'
import { triggerLocalSqliteSyncIfAvailable } from '@/lib/local-sqlite-sync-trigger'

describe('local SQLite sync trigger', () => {
  it('does nothing for Supabase-only data sources', async () => {
    const onSynced = vi.fn()
    const result = await triggerLocalSqliteSyncIfAvailable({
      dataSource: { mode: 'supabase' } as FinanceDataSource,
      onSynced,
    })

    expect(result).toBe(false)
    expect(onSynced).not.toHaveBeenCalled()
  })

  it('triggers one pending-operation sync and invalidates afterward', async () => {
    const syncPendingOperations = vi.fn().mockResolvedValue({ syncedCount: 1 })
    const onSynced = vi.fn()

    const result = await triggerLocalSqliteSyncIfAvailable({
      dataSource: {
        mode: 'offline',
        syncPendingOperations,
      } as unknown as FinanceDataSource,
      onSynced,
    })

    expect(result).toBe(true)
    expect(syncPendingOperations).toHaveBeenCalledTimes(1)
    expect(onSynced).toHaveBeenCalledTimes(1)
  })
})
