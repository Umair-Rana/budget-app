import type { SupabaseClient } from '@supabase/supabase-js'

import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import type { HouseholdMemberRole } from '@/data/supabase/household-sharing'
import type { Database } from '@/lib/supabase/database.types'

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

  return 'Supabase household deletion request failed.'
}

function rpcClient(client: SupabaseClient<Database>) {
  return client as unknown as SupabaseRpcClient
}

function normalizeHousehold(data: unknown): CloudHousehold {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throw new Error('Deleting household did not return a replacement household.')
  }

  const household = row as Partial<CloudHousehold>

  if (
    !household.id ||
    !household.name ||
    !household.currency ||
    !household.locale
  ) {
    throw new Error(
      'Deleting household returned an incomplete replacement household.',
    )
  }

  return {
    currency: household.currency,
    id: household.id,
    locale: household.locale,
    name: household.name,
  }
}

export function isExactHouseholdNameConfirmation({
  confirmation,
  householdName,
}: {
  confirmation: string
  householdName: string
}) {
  return confirmation === householdName
}

export function canDeleteHousehold({
  isOnline,
  role,
}: {
  isOnline: boolean
  role?: HouseholdMemberRole
}) {
  return isOnline && role === 'owner'
}

export async function deleteHouseholdAndCreateReplacement({
  client,
  householdId,
}: {
  client: SupabaseClient<Database>
  householdId: string
}) {
  const { data, error } = await rpcClient(client).rpc<unknown>(
    'delete_household_and_create_replacement_household',
    {
      p_household_id: householdId,
    },
  )

  if (error) {
    throw new Error(
      `Could not delete household. No changes were made. ${getErrorMessage(
        error,
      )}`,
    )
  }

  return normalizeHousehold(data)
}
