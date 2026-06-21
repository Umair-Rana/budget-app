import type { SupabaseClient } from '@supabase/supabase-js'

import type { EntityId } from '@/data/models/common'
import type { Database } from '@/lib/supabase/database.types'

export type SupabaseFinanceRepositoryContext = {
  client: SupabaseClient<Database>
  householdId: EntityId
  userId: EntityId
}

export type SupabaseFinanceRepositoryContextInput = {
  client?: SupabaseClient<Database> | null
  householdId?: EntityId | null
  userId?: EntityId | null
}

export const missingSupabaseFinanceContextMessage =
  'Supabase finance repositories require client, householdId, and userId.'

export function requireSupabaseFinanceRepositoryContext(
  input: SupabaseFinanceRepositoryContextInput,
): SupabaseFinanceRepositoryContext {
  if (!input.client || !input.householdId || !input.userId) {
    throw new Error(missingSupabaseFinanceContextMessage)
  }

  return {
    client: input.client,
    householdId: input.householdId,
    userId: input.userId,
  }
}
