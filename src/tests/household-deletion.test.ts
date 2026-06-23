import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import {
  canDeleteHousehold,
  deleteHouseholdAndCreateReplacement,
  isExactHouseholdNameConfirmation,
} from '@/data/supabase/household-deletion'
import type { Database } from '@/lib/supabase/database.types'

const replacementHouseholdRow = {
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'owner-1',
  currency: 'PKR',
  deleted_at: null,
  id: 'replacement-household-1',
  locale: 'en-PK',
  name: 'My Household',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function createMockClient(
  implementation: (
    functionName: string,
    args?: Record<string, unknown>,
  ) => unknown,
) {
  const rpc = vi.fn(async (functionName: string, args?: Record<string, unknown>) => ({
    data: implementation(functionName, args),
    error: null,
  }))

  return {
    client: { rpc } as unknown as SupabaseClient<Database>,
    rpc,
  }
}

function createErrorClient(message: string) {
  const rpc = vi.fn(async () => ({
    data: null,
    error: {
      message,
    },
  }))

  return {
    client: { rpc } as unknown as SupabaseClient<Database>,
    rpc,
  }
}

describe('household deletion', () => {
  it('requires exact household name confirmation', () => {
    expect(
      isExactHouseholdNameConfirmation({
        confirmation: 'Shared Household',
        householdName: 'Shared Household',
      }),
    ).toBe(true)
    expect(
      isExactHouseholdNameConfirmation({
        confirmation: ' shared household ',
        householdName: 'Shared Household',
      }),
    ).toBe(false)
    expect(
      isExactHouseholdNameConfirmation({
        confirmation: 'shared household',
        householdName: 'Shared Household',
      }),
    ).toBe(false)
  })

  it('allows deletion only for online owners', () => {
    expect(canDeleteHousehold({ isOnline: true, role: 'owner' })).toBe(true)
    expect(canDeleteHousehold({ isOnline: true, role: 'member' })).toBe(false)
    expect(canDeleteHousehold({ isOnline: true, role: 'viewer' })).toBe(false)
    expect(canDeleteHousehold({ isOnline: false, role: 'owner' })).toBe(false)
    expect(canDeleteHousehold({ isOnline: true })).toBe(false)
  })

  it('calls the atomic delete and replacement RPC', async () => {
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'delete_household_and_create_replacement_household') {
        return replacementHouseholdRow
      }

      return null
    })

    const replacementHousehold = await deleteHouseholdAndCreateReplacement({
      client,
      householdId: 'old-household-1',
    })

    expect(replacementHousehold).toEqual({
      currency: 'PKR',
      id: 'replacement-household-1',
      locale: 'en-PK',
      name: 'My Household',
    })
    expect(rpc).toHaveBeenCalledWith(
      'delete_household_and_create_replacement_household',
      {
        p_household_id: 'old-household-1',
      },
    )
  })

  it('surfaces owner-only RPC rejection without normalizing it away', async () => {
    const { client } = createErrorClient(
      'Only the household owner can delete this household.',
    )

    await expect(
      deleteHouseholdAndCreateReplacement({
        client,
        householdId: 'old-household-1',
      }),
    ).rejects.toThrow('Only the household owner can delete this household.')
  })

  it('rejects incomplete replacement household responses', async () => {
    const { client } = createMockClient((functionName) =>
      functionName === 'delete_household_and_create_replacement_household'
        ? { id: 'replacement-household-1' }
        : null,
    )

    await expect(
      deleteHouseholdAndCreateReplacement({
        client,
        householdId: 'old-household-1',
      }),
    ).rejects.toThrow(
      'Deleting household returned an incomplete replacement household.',
    )
  })

})
