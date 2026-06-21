import type {
  Account,
  UpdateAccountInput,
} from '@/data/models/account'
import type {
  AccountInsertRow,
  AccountRow,
  AccountUpdateRow,
  SupabaseFinanceMapperContext,
} from '@/data/supabase/supabase-finance-types'
import {
  nullable,
  optional,
  toSupabaseRecordFields,
  toSupabaseUpdateMetadata,
} from '@/data/supabase/mappers/mapper-utils'

export function fromSupabaseAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? 'Wallet',
    color: row.color ?? '#64748b',
    currency: row.currency,
    openingBalance: row.opening_balance,
    currentBalance: row.current_balance,
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: optional(row.archived_at),
    deletedAt: optional(row.deleted_at),
  }
}

export function toSupabaseAccountInsert(
  account: Account,
  context: SupabaseFinanceMapperContext,
): AccountInsertRow {
  return {
    ...toSupabaseRecordFields(account, context),
    name: account.name,
    type: account.type,
    currency: account.currency,
    opening_balance: account.openingBalance,
    current_balance: account.currentBalance,
    institution: null,
    color: nullable(account.color),
    icon: nullable(account.icon),
    notes: nullable(account.notes),
  }
}

export function toSupabaseAccountUpdate(
  input: UpdateAccountInput,
  context: Pick<SupabaseFinanceMapperContext, 'now' | 'userId'>,
): AccountUpdateRow {
  const update: AccountUpdateRow = toSupabaseUpdateMetadata(context)

  if ('name' in input) {
    update.name = input.name
  }

  if ('type' in input) {
    update.type = input.type
  }

  if ('icon' in input) {
    update.icon = nullable(input.icon)
  }

  if ('color' in input) {
    update.color = nullable(input.color)
  }

  if ('currency' in input) {
    update.currency = input.currency
  }

  if ('openingBalance' in input) {
    update.opening_balance = input.openingBalance
  }

  if ('notes' in input) {
    update.notes = nullable(input.notes)
  }

  return update
}
