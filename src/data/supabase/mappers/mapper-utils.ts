import type { FinanceRecord } from '@/data/models/common'
import type {
  FinanceRecordRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'

export function nullable<T>(value: T | undefined): T | null {
  return value ?? null
}

export function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined
}

export function linkedSourceFromIds(input: {
  linkedBillId?: string
  linkedGoalId?: string
  linkedLoanId?: string
}): {
  linked_source_type: 'bill' | 'goal' | 'loan' | null
  linked_source_id: string | null
} {
  if (input.linkedBillId) {
    return {
      linked_source_type: 'bill',
      linked_source_id: input.linkedBillId,
    }
  }

  if (input.linkedGoalId) {
    return {
      linked_source_type: 'goal',
      linked_source_id: input.linkedGoalId,
    }
  }

  if (input.linkedLoanId) {
    return {
      linked_source_type: 'loan',
      linked_source_id: input.linkedLoanId,
    }
  }

  return {
    linked_source_type: null,
    linked_source_id: null,
  }
}

export function toSupabaseRecordFields(
  record: FinanceRecord,
  context: SupabaseFinanceMapperContext,
): FinanceRecordRow {
  return {
    id: record.id,
    household_id: context.householdId,
    created_by: context.userId ?? null,
    updated_by: context.userId ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    archived_at: record.archivedAt ?? null,
    deleted_at: record.deletedAt ?? null,
  }
}

export function toSupabaseUpdateMetadata(
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
) {
  return {
    updated_by: context.userId ?? null,
    updated_at: context.now ?? new Date().toISOString(),
  }
}
