import type { SupabaseClient, User } from '@supabase/supabase-js'

import type { FinanceDataSource } from '@/data/contracts'
import { createSupabaseFinanceDataSource } from '@/data/supabase/supabase-finance-data-source'
import type { Database } from '@/lib/supabase/database.types'

export type CloudHousehold = Pick<
  Database['public']['Tables']['households']['Row'],
  'currency' | 'id' | 'locale' | 'name'
>

export type HouseholdBootstrapResult = {
  dataSource: FinanceDataSource
  household: CloudHousehold
}

type HouseholdBootstrapInput = {
  client: SupabaseClient<Database>
  createDataSource?: typeof createSupabaseFinanceDataSource
  user: User
}

function bootstrapErrorMessage(error: unknown) {
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

  return 'Cloud household setup failed.'
}

function normalizeHousehold(data: unknown): CloudHousehold {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== 'object') {
    throw new Error('Cloud household setup did not return a household.')
  }

  const household = row as Partial<CloudHousehold>

  if (
    !household.id ||
    !household.name ||
    !household.currency ||
    !household.locale
  ) {
    throw new Error('Cloud household setup returned an incomplete household.')
  }

  return {
    currency: household.currency,
    id: household.id,
    locale: household.locale,
    name: household.name,
  }
}

export async function bootstrapSupabaseHousehold({
  client,
  createDataSource = createSupabaseFinanceDataSource,
  user,
}: HouseholdBootstrapInput): Promise<HouseholdBootstrapResult> {
  const { data, error } = await client.rpc('bootstrap_finance_household', {
    p_email: user.email ?? undefined,
  })

  if (error) {
    throw new Error(bootstrapErrorMessage(error))
  }

  const household = normalizeHousehold(data)
  const dataSource = createDataSource({
    client,
    householdId: household.id,
    userId: user.id,
  })

  await dataSource.categories.seedDefaultsIfNeeded()

  return {
    dataSource,
    household,
  }
}
