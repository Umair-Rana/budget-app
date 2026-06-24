import type { FinanceRecord } from '@/data/models/common'
import type {
  LocalFinanceRecordRow,
  LocalSqliteBoolean,
} from '@/data/local-sqlite/local-finance-row-types'

export function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined
}

export function nullable<T>(value: T | undefined): T | null {
  return value ?? null
}

export function fromSqliteBoolean(value: number): boolean {
  return value === 1
}

export function toSqliteBoolean(value: boolean): LocalSqliteBoolean {
  return value ? 1 : 0
}

export function fromLocalRecordRow(row: LocalFinanceRecordRow): FinanceRecord {
  return {
    archivedAt: optional(row.archived_at),
    createdAt: row.created_at,
    deletedAt: optional(row.deleted_at),
    id: row.id,
    updatedAt: row.updated_at,
  }
}

export function toLocalRecordRow(
  record: FinanceRecord,
  context: { householdId: string; userId?: string },
): LocalFinanceRecordRow {
  return {
    archived_at: nullable(record.archivedAt),
    created_at: record.createdAt,
    created_by: context.userId ?? null,
    deleted_at: nullable(record.deletedAt),
    household_id: context.householdId,
    id: record.id,
    updated_at: record.updatedAt,
    updated_by: context.userId ?? null,
  }
}

export function parseJsonArray(value: string | null): string[] | undefined {
  if (!value) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

export function stringifyJsonArray(value: string[] | undefined): string | null {
  return value && value.length > 0 ? JSON.stringify(value) : null
}
