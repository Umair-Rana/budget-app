import type { Account } from '@/data/models/account'
import type { LocalAccountRow } from '@/data/local-sqlite/local-finance-row-types'
import {
  fromLocalRecordRow,
  nullable,
  optional,
  toLocalRecordRow,
} from '@/data/local-sqlite/mappers/mapper-utils'

export function fromLocalAccountRow(row: LocalAccountRow): Account {
  return {
    ...fromLocalRecordRow(row),
    color: row.color ?? '#64748b',
    currency: row.currency,
    currentBalance: row.current_balance,
    icon: row.icon ?? 'Wallet',
    name: row.name,
    notes: optional(row.notes),
    openingBalance: row.opening_balance,
    type: row.type,
  }
}

export function toLocalAccountRow(
  account: Account,
  context: { householdId: string; userId?: string },
): LocalAccountRow {
  return {
    ...toLocalRecordRow(account, context),
    color: nullable(account.color),
    currency: account.currency,
    current_balance: account.currentBalance,
    icon: nullable(account.icon),
    institution: null,
    name: account.name,
    notes: nullable(account.notes),
    opening_balance: account.openingBalance,
    type: account.type,
  }
}
