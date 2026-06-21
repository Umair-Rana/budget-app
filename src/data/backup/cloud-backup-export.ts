import type { SupabaseClient } from '@supabase/supabase-js'

import {
  cloudBackupAppName,
  cloudBackupSource,
  cloudBackupVersion,
  CloudBackupError,
  type CloudBackupFile,
  type CloudBackupTableRow,
} from '@/data/backup/cloud-backup-types'
import type { Database } from '@/lib/supabase/database.types'

type HouseholdScopedTableName =
  | 'household_members'
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'recurring_transactions'
  | 'bills'
  | 'goals'
  | 'loans'
  | 'budgets'
  | 'audit_history'

type SupabaseQueryResult<T> = {
  data: T | null
  error: unknown
}

type SupabaseQueryBuilder<T> = {
  eq: (column: string, value: string) => SupabaseQueryBuilder<T>
  maybeSingle: () => Promise<SupabaseQueryResult<T | null>>
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<SupabaseQueryResult<T[]>>
}

type SupabaseBackupClient = {
  from: <TableName extends HouseholdScopedTableName | 'households'>(
    table: TableName,
  ) => {
    select: (columns: string) => SupabaseQueryBuilder<
      TableName extends keyof Database['public']['Tables']
        ? CloudBackupTableRow<TableName>
        : never
    >
  }
}

type CreateCloudBackupInput = {
  client: SupabaseClient<Database> | null | undefined
  householdId: string | null | undefined
  now?: Date
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

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

  return 'Unknown Supabase error.'
}

export function createCloudBackupFileName(now = new Date()) {
  const year = now.getFullYear()
  const month = padDatePart(now.getMonth() + 1)
  const day = padDatePart(now.getDate())
  const hours = padDatePart(now.getHours())
  const minutes = padDatePart(now.getMinutes())

  return `household-finance-cloud-backup-${year}-${month}-${day}-${hours}-${minutes}.json`
}

function requireCloudBackupContext({
  client,
  householdId,
}: CreateCloudBackupInput) {
  if (!client) {
    throw new CloudBackupError(
      'Cloud backup requires an authenticated Supabase session.',
    )
  }

  if (!householdId) {
    throw new CloudBackupError(
      'Cloud backup requires a loaded household before export.',
    )
  }

  return {
    client: client as unknown as SupabaseBackupClient,
    householdId,
  }
}

async function fetchHousehold(
  client: SupabaseBackupClient,
  householdId: string,
) {
  const { data, error } = await client
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle()

  if (error) {
    throw new CloudBackupError(
      `Could not export household: ${getErrorMessage(error)}`,
      error,
    )
  }

  if (!data) {
    throw new CloudBackupError('Cloud household was not found for export.')
  }

  return data
}

async function fetchHouseholdRows<TableName extends HouseholdScopedTableName>(
  client: SupabaseBackupClient,
  tableName: TableName,
  householdId: string,
) {
  const { data, error } = await client
    .from(tableName)
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new CloudBackupError(
      `Could not export ${tableName}: ${getErrorMessage(error)}`,
      error,
    )
  }

  return (data ?? []) as CloudBackupTableRow<TableName>[]
}

export async function createCloudBackup({
  client,
  householdId,
  now = new Date(),
}: CreateCloudBackupInput): Promise<CloudBackupFile> {
  const backupContext = requireCloudBackupContext({ client, householdId })
  const [
    household,
    householdMembers,
    accounts,
    categories,
    transactions,
    recurringTransactions,
    bills,
    goals,
    loans,
    budgets,
  ] = await Promise.all([
    fetchHousehold(backupContext.client, backupContext.householdId),
    fetchHouseholdRows(
      backupContext.client,
      'household_members',
      backupContext.householdId,
    ),
    fetchHouseholdRows(
      backupContext.client,
      'accounts',
      backupContext.householdId,
    ),
    fetchHouseholdRows(
      backupContext.client,
      'categories',
      backupContext.householdId,
    ),
    fetchHouseholdRows(
      backupContext.client,
      'transactions',
      backupContext.householdId,
    ),
    fetchHouseholdRows(
      backupContext.client,
      'recurring_transactions',
      backupContext.householdId,
    ),
    fetchHouseholdRows(backupContext.client, 'bills', backupContext.householdId),
    fetchHouseholdRows(backupContext.client, 'goals', backupContext.householdId),
    fetchHouseholdRows(backupContext.client, 'loans', backupContext.householdId),
    fetchHouseholdRows(
      backupContext.client,
      'budgets',
      backupContext.householdId,
    ),
  ])
  const stores: CloudBackupFile['stores'] = {
    household_members: householdMembers,
    accounts,
    categories,
    transactions,
    recurring_transactions: recurringTransactions,
    bills,
    goals,
    loans,
    budgets,
  }

  try {
    stores.audit_history = await fetchHouseholdRows(
      backupContext.client,
      'audit_history',
      backupContext.householdId,
    )
  } catch {
    // Audit history is optional for now; core finance export should still work.
  }

  return {
    app: cloudBackupAppName,
    backupVersion: cloudBackupVersion,
    source: cloudBackupSource,
    exportedAt: now.toISOString(),
    household,
    stores,
  }
}

export function serializeCloudBackup(backup: CloudBackupFile) {
  return JSON.stringify(backup, null, 2)
}

export function downloadCloudBackupFile(backup: CloudBackupFile) {
  const blob = new Blob([serializeCloudBackup(backup)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = createCloudBackupFileName(new Date(backup.exportedAt))
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
