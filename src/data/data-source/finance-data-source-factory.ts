import type { FinanceDataSource } from '@/data/contracts'
import { createSupabaseFinanceDataSource } from '@/data/supabase/supabase-finance-data-source'
import type { SupabaseFinanceRepositoryContextInput } from '@/data/supabase/repositories/supabase-repository-context'
import { featureFlags } from '@/lib/feature-flags'

export type FinanceRepositoryRuntime = 'cloud'

export interface CreateFinanceDataSourceInput
  extends SupabaseFinanceRepositoryContextInput {
  runtime?: FinanceRepositoryRuntime
}

export function createFinanceDataSource(
  input: CreateFinanceDataSourceInput,
): FinanceDataSource {
  if (featureFlags.offlineMode) {
    throw new Error('Offline repository runtime is not implemented yet.')
  }

  return createSupabaseFinanceDataSource(input)
}
