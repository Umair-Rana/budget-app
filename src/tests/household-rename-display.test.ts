import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import {
  canRenameHousehold,
  isHouseholdNameChanged,
  normalizeHouseholdName,
  updateHouseholdName,
  validateHouseholdName,
} from '@/data/supabase/household-rename'
import {
  fallbackHouseholdTitle,
  getHouseholdDisplayName,
  getHouseholdHeaderDetails,
  getHouseholdOverviewTitle,
  getHouseholdWorkspaceSubtitle,
} from '@/lib/household-display'
import type { Database } from '@/lib/supabase/database.types'

const household: CloudHousehold = {
  currency: 'PKR',
  id: 'household-1',
  locale: 'en-PK',
  name: 'Umair Family',
}

function createHouseholdUpdateClient({
  data,
  error,
}: {
  data?: unknown
  error?: unknown
}) {
  const single = vi.fn(async () => ({
    data: data ?? household,
    error: error ?? null,
  }))
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    eq,
    from,
    select,
    single,
    update,
  }
}

describe('household rename', () => {
  it('normalizes and validates household names', () => {
    expect(normalizeHouseholdName('  Umair Family  ')).toBe('Umair Family')
    expect(validateHouseholdName('')).toBe('Household name is required.')
    expect(validateHouseholdName('   ')).toBe('Household name is required.')
    expect(validateHouseholdName('A')).toBe(
      'Household name must be at least 2 characters.',
    )
    expect(validateHouseholdName('A'.repeat(51))).toBe(
      'Household name must be 50 characters or fewer.',
    )
    expect(validateHouseholdName('Umair Family')).toBeNull()
  })

  it('allows only owners to rename', () => {
    expect(canRenameHousehold('owner')).toBe(true)
    expect(canRenameHousehold('member')).toBe(false)
    expect(canRenameHousehold('viewer')).toBe(false)
    expect(canRenameHousehold()).toBe(false)
  })

  it('detects unchanged names after trimming', () => {
    expect(
      isHouseholdNameChanged({
        currentName: 'Umair Family',
        nextName: '  Umair Family  ',
      }),
    ).toBe(false)
    expect(
      isHouseholdNameChanged({
        currentName: 'Umair Family',
        nextName: 'Umair Home',
      }),
    ).toBe(true)
  })

  it('updates household name through Supabase and returns the renamed household', async () => {
    const { client, eq, from, select, update } = createHouseholdUpdateClient({
      data: {
        currency: 'PKR',
        id: 'household-1',
        locale: 'en-PK',
        name: 'Umair Home',
      },
    })

    const renamedHousehold = await updateHouseholdName({
      client,
      householdId: 'household-1',
      name: '  Umair Home  ',
    })

    expect(renamedHousehold.name).toBe('Umair Home')
    expect(from).toHaveBeenCalledWith('households')
    expect(update).toHaveBeenCalledWith({ name: 'Umair Home' })
    expect(eq).toHaveBeenCalledWith('id', 'household-1')
    expect(select).toHaveBeenCalledWith('id, name, currency, locale')
  })

  it('surfaces failed Supabase rename without returning a new household', async () => {
    const { client } = createHouseholdUpdateClient({
      error: { message: 'Only household owners can update households.' },
    })

    await expect(
      updateHouseholdName({
        client,
        householdId: 'household-1',
        name: 'Umair Home',
      }),
    ).rejects.toThrow('Only household owners can update households.')
  })
})

describe('household display helpers', () => {
  it('uses active household name for app chrome', () => {
    expect(getHouseholdDisplayName(household)).toBe('Umair Family')
    expect(getHouseholdWorkspaceSubtitle()).toBe('Monthly budget workspace')
    expect(getHouseholdHeaderDetails(household)).toBe(
      'Pakistan locale | PKR | DD/MM/YYYY',
    )
  })

  it('uses active household name for overview title', () => {
    expect(getHouseholdOverviewTitle(household)).toBe(
      'Umair Family money snapshot',
    )
  })

  it('uses fallback title only before household data is ready', () => {
    expect(getHouseholdDisplayName(null)).toBe(fallbackHouseholdTitle)
    expect(getHouseholdOverviewTitle(null)).toBe(
      `${fallbackHouseholdTitle} money snapshot`,
    )
  })
})
