import type { Database } from '@/lib/supabase/database.types'

type PublicTables = Database['public']['Tables']
export type CloudBackupTableRow<TableName extends keyof PublicTables> =
  PublicTables[TableName]['Row']

export const cloudBackupAppName = 'Household Finance'
export const cloudBackupVersion = 2
export const cloudBackupSource = 'supabase'

export type CloudBackupStores = {
  household_members: CloudBackupTableRow<'household_members'>[]
  accounts: CloudBackupTableRow<'accounts'>[]
  categories: CloudBackupTableRow<'categories'>[]
  transactions: CloudBackupTableRow<'transactions'>[]
  recurring_transactions: CloudBackupTableRow<'recurring_transactions'>[]
  recurring_bills: CloudBackupTableRow<'recurring_bills'>[]
  bills: CloudBackupTableRow<'bills'>[]
  goals: CloudBackupTableRow<'goals'>[]
  loans: CloudBackupTableRow<'loans'>[]
  budgets: CloudBackupTableRow<'budgets'>[]
  audit_history?: CloudBackupTableRow<'audit_history'>[]
}

export type CloudBackupFile = {
  app: typeof cloudBackupAppName
  backupVersion: typeof cloudBackupVersion
  source: typeof cloudBackupSource
  exportedAt: string
  household: CloudBackupTableRow<'households'>
  stores: CloudBackupStores
}

export class CloudBackupError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'CloudBackupError'
    this.cause = cause
  }
}
