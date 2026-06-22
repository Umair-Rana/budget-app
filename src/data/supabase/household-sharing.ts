import type { SupabaseClient } from '@supabase/supabase-js'

import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import type { Database } from '@/lib/supabase/database.types'

export type HouseholdMemberRole = 'owner' | 'member' | 'viewer'
export type HouseholdInviteStatus =
  | 'pending'
  | 'accepted'
  | 'revoked'
  | 'expired'

export type PendingHouseholdInvite = {
  id: string
  householdId: string
  householdName: string
  invitedEmail: string
  role: HouseholdMemberRole
  status: HouseholdInviteStatus
  createdAt: string
  expiresAt?: string
}

export type HouseholdMember = {
  id: string
  householdId: string
  userId: string
  email?: string
  role: HouseholdMemberRole
  createdAt: string
}

export type HouseholdOutgoingInvite = {
  id: string
  householdId: string
  invitedEmail: string
  role: HouseholdMemberRole
  status: HouseholdInviteStatus
  invitedBy?: string
  createdAt: string
  expiresAt?: string
}

export type HouseholdSharingOverview = {
  members: HouseholdMember[]
  pendingInvites: HouseholdOutgoingInvite[]
}

type SupabaseRpcResult<T> = {
  data: T | null
  error: unknown
}

type SupabaseRpcClient = {
  rpc: <T>(
    functionName: string,
    args?: Record<string, unknown>,
  ) => Promise<SupabaseRpcResult<T>>
}

type PendingInviteRow = {
  id: string
  household_id: string
  household_name: string
  invited_email: string
  role: HouseholdMemberRole
  status: HouseholdInviteStatus
  created_at: string
  expires_at: string | null
}

type HouseholdMemberRow = {
  id: string
  household_id: string
  user_id: string
  email: string | null
  role: HouseholdMemberRole
  created_at: string
}

type OutgoingInviteRow = {
  id: string
  household_id: string
  invited_email: string
  role: HouseholdMemberRole
  status: HouseholdInviteStatus
  invited_by: string | null
  created_at: string
  expires_at: string | null
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Supabase household sharing request failed.'
}

function rpcClient(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseRpcClient
}

function throwSharingError(operation: string, error: unknown): never {
  throw new Error(`${operation} failed. ${getErrorMessage(error)}`)
}

function normalizeOptional(value: string | null | undefined) {
  return value ?? undefined
}

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

export function assertCanInviteEmail(invitedEmail: string, currentEmail?: string) {
  const normalizedEmail = normalizeInviteEmail(invitedEmail)

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Invite email is required.')
  }

  if (
    currentEmail &&
    normalizedEmail === normalizeInviteEmail(currentEmail)
  ) {
    throw new Error('You cannot invite yourself.')
  }

  return normalizedEmail
}

function mapPendingInvite(row: PendingInviteRow): PendingHouseholdInvite {
  return {
    id: row.id,
    householdId: row.household_id,
    householdName: row.household_name,
    invitedEmail: row.invited_email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: normalizeOptional(row.expires_at),
  }
}

function mapHouseholdMember(row: HouseholdMemberRow): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    email: normalizeOptional(row.email),
    role: row.role,
    createdAt: row.created_at,
  }
}

function mapOutgoingInvite(row: OutgoingInviteRow): HouseholdOutgoingInvite {
  return {
    id: row.id,
    householdId: row.household_id,
    invitedEmail: row.invited_email,
    role: row.role,
    status: row.status,
    invitedBy: normalizeOptional(row.invited_by),
    createdAt: row.created_at,
    expiresAt: normalizeOptional(row.expires_at),
  }
}

function normalizeHousehold(data: unknown): CloudHousehold {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throw new Error('Household invite did not return a household.')
  }

  const household = row as Partial<CloudHousehold>

  if (
    !household.id ||
    !household.name ||
    !household.currency ||
    !household.locale
  ) {
    throw new Error('Household invite returned an incomplete household.')
  }

  return {
    currency: household.currency,
    id: household.id,
    locale: household.locale,
    name: household.name,
  }
}

export async function getMyHouseholdInvites(
  client: SupabaseClient<Database>,
) {
  const { data, error } = await rpcClient(client).rpc<PendingInviteRow[]>(
    'get_my_household_invites',
  )

  if (error) {
    throwSharingError('Loading household invites', error)
  }

  return (data ?? []).map(mapPendingInvite)
}

export async function acceptHouseholdInvite(
  client: SupabaseClient<Database>,
  inviteId: string,
) {
  const { data, error } = await rpcClient(client).rpc<unknown>(
    'accept_household_invite',
    {
      p_invite_id: inviteId,
    },
  )

  if (error) {
    throwSharingError('Accepting household invite', error)
  }

  return normalizeHousehold(data)
}

export async function createHouseholdInvite({
  client,
  currentEmail,
  householdId,
  invitedEmail,
}: {
  client: SupabaseClient<Database>
  currentEmail?: string
  householdId: string
  invitedEmail: string
}) {
  const normalizedEmail = assertCanInviteEmail(invitedEmail, currentEmail)
  const { data, error } = await rpcClient(client).rpc<OutgoingInviteRow>(
    'create_household_invite',
    {
      p_household_id: householdId,
      p_invited_email: normalizedEmail,
      p_role: 'member',
    },
  )

  if (error) {
    throwSharingError('Creating household invite', error)
  }

  if (!data) {
    throw new Error('Creating household invite did not return an invite.')
  }

  return mapOutgoingInvite(data)
}

export async function revokeHouseholdInvite(
  client: SupabaseClient<Database>,
  inviteId: string,
) {
  const { data, error } = await rpcClient(client).rpc<OutgoingInviteRow>(
    'revoke_household_invite',
    {
      p_invite_id: inviteId,
    },
  )

  if (error) {
    throwSharingError('Revoking household invite', error)
  }

  if (!data) {
    throw new Error('Revoking household invite did not return an invite.')
  }

  return mapOutgoingInvite(data)
}

export async function getHouseholdSharingOverview({
  client,
  householdId,
}: {
  client: SupabaseClient<Database>
  householdId: string
}): Promise<HouseholdSharingOverview> {
  const [membersResult, invitesResult] = await Promise.all([
    rpcClient(client).rpc<HouseholdMemberRow[]>('get_household_members', {
      p_household_id: householdId,
    }),
    rpcClient(client).rpc<OutgoingInviteRow[]>('get_household_pending_invites', {
      p_household_id: householdId,
    }),
  ])

  if (membersResult.error) {
    throwSharingError('Loading household members', membersResult.error)
  }

  if (invitesResult.error) {
    throwSharingError('Loading household invites', invitesResult.error)
  }

  return {
    members: (membersResult.data ?? []).map(mapHouseholdMember),
    pendingInvites: (invitesResult.data ?? []).map(mapOutgoingInvite),
  }
}
