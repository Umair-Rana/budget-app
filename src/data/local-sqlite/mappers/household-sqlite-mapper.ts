import type {
  LocalHousehold,
  LocalHouseholdMember,
  LocalHouseholdMemberRow,
  LocalHouseholdRow,
} from '@/data/local-sqlite/local-finance-row-types'
import { optional } from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalHouseholdRow(row: LocalHouseholdRow): LocalHousehold {
  return {
    currency: row.currency,
    id: row.id,
    locale: row.locale,
    name: row.name,
  }
}

export function toLocalHouseholdRow(household: LocalHousehold): LocalHouseholdRow {
  const now = new Date().toISOString()

  return {
    archived_at: null,
    created_at: now,
    created_by: null,
    currency: household.currency,
    deleted_at: null,
    id: household.id,
    locale: household.locale,
    name: household.name,
    updated_at: now,
  }
}

export function fromLocalHouseholdMemberRow(
  row: LocalHouseholdMemberRow,
): LocalHouseholdMember {
  return {
    createdAt: row.created_at,
    deletedAt: optional(row.deleted_at),
    householdId: row.household_id,
    id: row.id,
    role: row.role,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}
