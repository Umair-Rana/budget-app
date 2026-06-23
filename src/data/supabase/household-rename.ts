import type { SupabaseClient } from '@supabase/supabase-js'

import type { CloudHousehold } from '@/data/supabase/household-bootstrap'
import type { HouseholdMemberRole } from '@/data/supabase/household-sharing'
import type { Database } from '@/lib/supabase/database.types'

export const householdNameMinLength = 2
export const householdNameMaxLength = 50

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

  return 'Supabase household rename request failed.'
}

function normalizeHousehold(data: unknown): CloudHousehold {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throw new Error('Renaming household did not return a household.')
  }

  const household = row as Partial<CloudHousehold>

  if (
    !household.id ||
    !household.name ||
    !household.currency ||
    !household.locale
  ) {
    throw new Error('Renaming household returned an incomplete household.')
  }

  return {
    currency: household.currency,
    id: household.id,
    locale: household.locale,
    name: household.name,
  }
}

export function normalizeHouseholdName(name: string) {
  return name.trim()
}

export function validateHouseholdName(name: string) {
  const normalizedName = normalizeHouseholdName(name)

  if (!normalizedName) {
    return 'Household name is required.'
  }

  if (normalizedName.length < householdNameMinLength) {
    return `Household name must be at least ${householdNameMinLength} characters.`
  }

  if (normalizedName.length > householdNameMaxLength) {
    return `Household name must be ${householdNameMaxLength} characters or fewer.`
  }

  return null
}

export function canRenameHousehold(role?: HouseholdMemberRole) {
  return role === 'owner'
}

export function isHouseholdNameChanged({
  currentName,
  nextName,
}: {
  currentName: string
  nextName: string
}) {
  return normalizeHouseholdName(nextName) !== currentName
}

export async function updateHouseholdName({
  client,
  householdId,
  name,
}: {
  client: SupabaseClient<Database>
  householdId: string
  name: string
}) {
  const normalizedName = normalizeHouseholdName(name)
  const validationError = validateHouseholdName(normalizedName)

  if (validationError) {
    throw new Error(validationError)
  }

  const { data, error } = await client
    .from('households')
    .update({ name: normalizedName })
    .eq('id', householdId)
    .select('id, name, currency, locale')
    .single()

  if (error) {
    throw new Error(`Could not rename household. ${getErrorMessage(error)}`)
  }

  return normalizeHousehold(data)
}
