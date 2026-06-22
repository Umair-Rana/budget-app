import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { FinanceDataSource } from '@/data/contracts'
import {
  bootstrapSupabaseHousehold,
  prepareSupabaseHousehold,
} from '@/data/supabase/household-bootstrap'
import {
  acceptHouseholdInvite,
  assertCanInviteEmail,
  canRemoveHouseholdMember,
  createHouseholdInvite,
  getHouseholdSharingOverview,
  normalizeInviteEmail,
  removeHouseholdMember,
  revokeHouseholdInvite,
} from '@/data/supabase/household-sharing'
import type { Database } from '@/lib/supabase/database.types'

const householdRow = {
  currency: 'PKR',
  id: 'household-1',
  locale: 'en-PK',
  name: 'Shared Household',
}

const inviteRow = {
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: null,
  household_id: 'household-1',
  household_name: 'Shared Household',
  id: 'invite-1',
  invited_email: 'member@example.com',
  role: 'member',
  status: 'pending',
}

const memberRow = {
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'member@example.com',
  household_id: 'household-1',
  id: 'member-row-1',
  role: 'member',
  user_id: 'member-1',
}

function createFinanceDataSourceStub(seedDefaultsIfNeeded = vi.fn()) {
  return {
    mode: 'supabase',
    categories: {
      seedDefaultsIfNeeded,
    },
  } as unknown as FinanceDataSource
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

describe('household sharing', () => {
  it('normalizes invite emails and blocks self invites', () => {
    expect(normalizeInviteEmail('  Member@Example.COM ')).toBe(
      'member@example.com',
    )
    expect(
      assertCanInviteEmail(' Member@Example.COM ', 'owner@example.com'),
    ).toBe('member@example.com')
    expect(() =>
      assertCanInviteEmail('Owner@Example.com', 'owner@example.com'),
    ).toThrow('You cannot invite yourself.')
  })

  it('creates invites with normalized email and member role', async () => {
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'create_household_invite') {
        return {
          ...inviteRow,
          invited_by: 'owner-1',
          household_name: undefined,
        }
      }

      return null
    })

    const invite = await createHouseholdInvite({
      client,
      currentEmail: 'owner@example.com',
      householdId: 'household-1',
      invitedEmail: ' Member@Example.COM ',
    })

    expect(invite.invitedEmail).toBe('member@example.com')
    expect(rpc).toHaveBeenCalledWith('create_household_invite', {
      p_household_id: 'household-1',
      p_invited_email: 'member@example.com',
      p_role: 'member',
    })
  })

  it('surfaces owner-only invite rejection', async () => {
    const { client } = createErrorClient(
      'Only household owners can invite members.',
    )

    await expect(
      createHouseholdInvite({
        client,
        currentEmail: 'member@example.com',
        householdId: 'household-1',
        invitedEmail: 'person@example.com',
      }),
    ).rejects.toThrow('Only household owners can invite members.')
  })

  it('surfaces existing member invite rejection', async () => {
    const { client } = createErrorClient(
      'This user is already a household member.',
    )

    await expect(
      createHouseholdInvite({
        client,
        currentEmail: 'owner@example.com',
        householdId: 'household-1',
        invitedEmail: 'member@example.com',
      }),
    ).rejects.toThrow('This user is already a household member.')
  })

  it('accepts an invite and returns the joined household', async () => {
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'accept_household_invite') {
        return householdRow
      }

      return null
    })

    const household = await acceptHouseholdInvite(client, 'invite-1')

    expect(household.id).toBe('household-1')
    expect(rpc).toHaveBeenCalledWith('accept_household_invite', {
      p_invite_id: 'invite-1',
    })
  })

  it('revokes pending invites', async () => {
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'revoke_household_invite') {
        return {
          ...inviteRow,
          household_name: undefined,
          invited_by: 'owner-1',
          status: 'revoked',
        }
      }

      return null
    })

    const invite = await revokeHouseholdInvite(client, 'invite-1')

    expect(invite.status).toBe('revoked')
    expect(rpc).toHaveBeenCalledWith('revoke_household_invite', {
      p_invite_id: 'invite-1',
    })
  })

  it('removes a household member with household and user parameters', async () => {
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'remove_household_member') {
        return {
          ...memberRow,
          email: undefined,
        }
      }

      return null
    })

    const member = await removeHouseholdMember({
      client,
      householdId: 'household-1',
      memberUserId: 'member-1',
    })

    expect(member.userId).toBe('member-1')
    expect(rpc).toHaveBeenCalledWith('remove_household_member', {
      p_household_id: 'household-1',
      p_member_user_id: 'member-1',
    })
  })

  it('surfaces member removal rejection for non-owners', async () => {
    const { client } = createErrorClient(
      'Only household owners can remove members.',
    )

    await expect(
      removeHouseholdMember({
        client,
        householdId: 'household-1',
        memberUserId: 'member-1',
      }),
    ).rejects.toThrow('Only household owners can remove members.')
  })

  it('surfaces self removal rejection', async () => {
    const { client } = createErrorClient(
      'You cannot remove yourself from the household.',
    )

    await expect(
      removeHouseholdMember({
        client,
        householdId: 'household-1',
        memberUserId: 'owner-1',
      }),
    ).rejects.toThrow('You cannot remove yourself from the household.')
  })

  it('surfaces last owner removal rejection', async () => {
    const { client } = createErrorClient(
      'You cannot remove the last household owner.',
    )

    await expect(
      removeHouseholdMember({
        client,
        householdId: 'household-1',
        memberUserId: 'owner-2',
      }),
    ).rejects.toThrow('You cannot remove the last household owner.')
  })

  it('hides remove action when current user is not owner', () => {
    expect(
      canRemoveHouseholdMember({
        currentRole: 'member',
        currentUserId: 'member-2',
        member: {
          createdAt: memberRow.created_at,
          email: memberRow.email,
          householdId: memberRow.household_id,
          id: memberRow.id,
          role: 'member',
          userId: memberRow.user_id,
        },
      }),
    ).toBe(false)
  })

  it('allows owners to remove non-owner members only', () => {
    expect(
      canRemoveHouseholdMember({
        currentRole: 'owner',
        currentUserId: 'owner-1',
        member: {
          createdAt: memberRow.created_at,
          email: memberRow.email,
          householdId: memberRow.household_id,
          id: memberRow.id,
          role: 'member',
          userId: memberRow.user_id,
        },
      }),
    ).toBe(true)

    expect(
      canRemoveHouseholdMember({
        currentRole: 'owner',
        currentUserId: 'owner-1',
        member: {
          createdAt: memberRow.created_at,
          householdId: memberRow.household_id,
          id: 'owner-row-1',
          role: 'owner',
          userId: 'owner-2',
        },
      }),
    ).toBe(false)
  })

  it('loads household members and pending invites', async () => {
    const { client } = createMockClient((functionName) => {
      if (functionName === 'get_household_members') {
        return [
          {
            created_at: '2026-01-01T00:00:00.000Z',
            email: 'owner@example.com',
            household_id: 'household-1',
            id: 'member-1',
            role: 'owner',
            user_id: 'owner-1',
          },
        ]
      }

      if (functionName === 'get_household_pending_invites') {
        return [
          {
            ...inviteRow,
            household_name: undefined,
            invited_by: 'owner-1',
          },
        ]
      }

      return null
    })

    const overview = await getHouseholdSharingOverview({
      client,
      householdId: 'household-1',
    })

    expect(overview.members).toMatchObject([
      {
        email: 'owner@example.com',
        role: 'owner',
      },
    ])
    expect(overview.pendingInvites).toMatchObject([
      {
        invitedEmail: 'member@example.com',
        status: 'pending',
      },
    ])
  })

  it('checks pending invites before creating a fresh household', async () => {
    const createDataSource = vi.fn(() => createFinanceDataSourceStub())
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'get_my_household_invites') {
        return [inviteRow]
      }

      if (functionName === 'bootstrap_finance_household') {
        return householdRow
      }

      return null
    })

    const result = await prepareSupabaseHousehold({
      client,
      createDataSource,
      user: {
        email: 'member@example.com',
        id: 'member-1',
      } as never,
    })

    expect(result.status).toBe('pending-invites')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('get_my_household_invites')
    expect(createDataSource).not.toHaveBeenCalled()
  })

  it('keeps normal bootstrap behavior when invite check is skipped', async () => {
    const seedDefaultsIfNeeded = vi.fn().mockResolvedValue({
      created: 0,
      skipped: 0,
    })
    const dataSource = createFinanceDataSourceStub(seedDefaultsIfNeeded)
    const createDataSource = vi.fn(() => dataSource)
    const { client, rpc } = createMockClient((functionName) => {
      if (functionName === 'bootstrap_finance_household') {
        return householdRow
      }

      return []
    })

    const result = await prepareSupabaseHousehold({
      client,
      createDataSource,
      skipInviteCheck: true,
      user: {
        email: 'member@example.com',
        id: 'member-1',
      } as never,
    })

    expect(result.status).toBe('ready')
    expect(rpc).toHaveBeenCalledWith('bootstrap_finance_household', {
      p_email: 'member@example.com',
    })
    expect(seedDefaultsIfNeeded).toHaveBeenCalledTimes(1)
  })

  it('still supports direct household bootstrap', async () => {
    const dataSource = createFinanceDataSourceStub(vi.fn().mockResolvedValue({}))
    const createDataSource = vi.fn(() => dataSource)
    const { client } = createMockClient((functionName) =>
      functionName === 'bootstrap_finance_household' ? householdRow : null,
    )

    const result = await bootstrapSupabaseHousehold({
      client,
      createDataSource,
      user: {
        email: 'owner@example.com',
        id: 'owner-1',
      } as never,
    })

    expect(result.household.id).toBe('household-1')
  })
})
