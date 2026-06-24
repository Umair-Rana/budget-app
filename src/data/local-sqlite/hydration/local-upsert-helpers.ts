import type {
  LocalHydrationEntityType,
} from '@/data/local-sqlite/hydration/local-hydration-types'
import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'

export type LocalSqliteUpsertRow = Record<string, number | string | null>

export type LocalSqliteUpsertStatement = {
  params: LocalSqliteStatementParams
  sql: string
}

function assertSafeSqlIdentifier(identifier: string) {
  if (!/^[a-z][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQLite identifier: ${identifier}`)
  }
}

export function createLocalUpsertStatement({
  conflictColumn = 'id',
  row,
  tableName,
}: {
  conflictColumn?: string
  row: LocalSqliteUpsertRow
  tableName: string
}): LocalSqliteUpsertStatement {
  assertSafeSqlIdentifier(tableName)
  assertSafeSqlIdentifier(conflictColumn)

  const columns = Object.keys(row)

  if (columns.length === 0) {
    throw new Error('Cannot create a SQLite upsert for an empty row.')
  }

  for (const column of columns) {
    assertSafeSqlIdentifier(column)
  }

  if (!columns.includes(conflictColumn)) {
    throw new Error(
      `Cannot create a SQLite upsert without conflict column "${conflictColumn}".`,
    )
  }

  const placeholders = columns.map(() => '?').join(', ')
  const updateColumns = columns.filter((column) => column !== conflictColumn)
  const updateClause =
    updateColumns.length > 0
      ? updateColumns
          .map((column) => `${column} = excluded.${column}`)
          .join(', ')
      : `${conflictColumn} = excluded.${conflictColumn}`

  return {
    params: columns.map((column) => row[column]),
    sql: [
      `insert into ${tableName} (${columns.join(', ')})`,
      `values (${placeholders})`,
      `on conflict(${conflictColumn}) do update set ${updateClause}`,
    ].join(' '),
  }
}

export async function upsertLocalSqliteRow({
  driver,
  row,
  tableName,
}: {
  driver: LocalSqliteDriver
  row: LocalSqliteUpsertRow
  tableName: string
}) {
  const statement = createLocalUpsertStatement({ row, tableName })

  await driver.run(statement.sql, statement.params)
}

export async function upsertLocalSqliteRows({
  driver,
  rows,
  tableName,
}: {
  driver: LocalSqliteDriver
  rows: readonly LocalSqliteUpsertRow[]
  tableName: string
}) {
  for (const row of rows) {
    await upsertLocalSqliteRow({ driver, row, tableName })
  }
}

export function createLocalSyncMetadataUpsertStatement({
  entityType,
  householdId,
  pulledAt,
}: {
  entityType: LocalHydrationEntityType
  householdId: string
  pulledAt: string
}): LocalSqliteUpsertStatement {
  const id = `${householdId}:${entityType}`

  return {
    params: [id, householdId, entityType, pulledAt, null, null, pulledAt, pulledAt],
    sql: [
      'insert into local_sync_metadata',
      '(',
      [
        'id',
        'household_id',
        'entity_type',
        'last_pulled_at',
        'last_pushed_at',
        'remote_cursor',
        'created_at',
        'updated_at',
      ].join(', '),
      ')',
      'values (?, ?, ?, ?, ?, ?, ?, ?)',
      'on conflict(id) do update set',
      [
        'household_id = excluded.household_id',
        'entity_type = excluded.entity_type',
        'last_pulled_at = excluded.last_pulled_at',
        'updated_at = excluded.updated_at',
      ].join(', '),
    ].join(' '),
  }
}

export async function upsertLocalSyncMetadata({
  driver,
  entityType,
  householdId,
  pulledAt,
}: {
  driver: LocalSqliteDriver
  entityType: LocalHydrationEntityType
  householdId: string
  pulledAt: string
}) {
  const statement = createLocalSyncMetadataUpsertStatement({
    entityType,
    householdId,
    pulledAt,
  })

  await driver.run(statement.sql, statement.params)
}

export async function markLocalHouseholdRowsDeleted({
  deletedAt,
  driver,
  householdId,
  tableName,
}: {
  deletedAt: string
  driver: LocalSqliteDriver
  householdId: string
  tableName: string
}) {
  assertSafeSqlIdentifier(tableName)

  await driver.run(
    `update ${tableName} set deleted_at = ?, updated_at = ? where household_id = ? and deleted_at is null`,
    [deletedAt, deletedAt, householdId],
  )
}
