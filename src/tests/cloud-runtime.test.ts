import type { SupabaseClient, User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { FinanceDataSource } from '@/data/contracts'
import * as financeDataSourceModule from '@/data/data-source/finance-data-source'
import { bootstrapSupabaseHousehold } from '@/data/supabase/household-bootstrap'
import type { Database } from '@/lib/supabase/database.types'

function createFinanceDataSourceStub(seedDefaultsIfNeeded = vi.fn()) {
  return {
    mode: 'supabase',
    categories: {
      seedDefaultsIfNeeded,
    },
  } as unknown as FinanceDataSource
}

describe('cloud-only runtime data source', () => {
  it('does not expose a static active IndexedDB data source', () => {
    expect('activeFinanceDataSource' in financeDataSourceModule).toBe(false)
    expect(financeDataSourceModule.indexedDbFinanceDataSource.mode).toBe(
      'indexeddb',
    )
  })

  it('creates the runtime source from Supabase household bootstrap', async () => {
    const seedDefaultsIfNeeded = vi.fn().mockResolvedValue({
      created: 0,
      skipped: 0,
    })
    const dataSource = createFinanceDataSourceStub(seedDefaultsIfNeeded)
    const createDataSource = vi.fn(() => dataSource)
    const rpc = vi.fn().mockResolvedValue({
      data: {
        currency: 'PKR',
        id: 'household-1',
        locale: 'en-PK',
        name: 'My Household',
      },
      error: null,
    })
    const client = { rpc } as unknown as SupabaseClient<Database>
    const user = {
      email: 'person@example.com',
      id: 'user-1',
    } as User

    const result = await bootstrapSupabaseHousehold({
      client,
      createDataSource,
      user,
    })

    expect(rpc).toHaveBeenCalledWith('bootstrap_finance_household', {
      p_email: 'person@example.com',
    })
    expect(createDataSource).toHaveBeenCalledWith({
      client,
      householdId: 'household-1',
      userId: 'user-1',
    })
    expect(seedDefaultsIfNeeded).toHaveBeenCalledTimes(1)
    expect(result.dataSource.mode).toBe('supabase')
    expect(result.household).toEqual({
      currency: 'PKR',
      id: 'household-1',
      locale: 'en-PK',
      name: 'My Household',
    })
  })

  it('fails clearly when household bootstrap cannot return a household', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as SupabaseClient<Database>

    await expect(
      bootstrapSupabaseHousehold({
        client,
        createDataSource: vi.fn(),
        user: { email: null, id: 'user-1' } as unknown as User,
      }),
    ).rejects.toThrow('Cloud household setup did not return a household.')
  })
})
