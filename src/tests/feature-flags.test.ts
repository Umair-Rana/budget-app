import { describe, expect, it } from 'vitest'

import { createFeatureFlags } from '@/lib/feature-flags'

describe('feature flags', () => {
  it('enables local SQLite read mode from the Vite env flag without requiring dev mode', () => {
    expect(
      createFeatureFlags({
        VITE_LOCAL_SQLITE_READ_MODE: 'true',
      }).localSqliteReadMode,
    ).toBe(true)
  })

  it('keeps local SQLite read mode disabled unless explicitly enabled', () => {
    expect(createFeatureFlags({}).localSqliteReadMode).toBe(false)
    expect(
      createFeatureFlags({
        VITE_LOCAL_SQLITE_READ_MODE: 'false',
      }).localSqliteReadMode,
    ).toBe(false)
  })
})
