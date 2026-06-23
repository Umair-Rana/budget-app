import {
  sortSqlitePocMigrations,
  sqlitePocMigrations,
  sqlitePocSchemaMigrationsTableSql,
} from '@/data/local-sqlite/poc/sqlite-poc-schema'
import type {
  SqlitePocDriver,
  SqlitePocMigration,
  SqlitePocNote,
  SqlitePocRunResult,
} from '@/data/local-sqlite/poc/sqlite-poc-types'

type MigrationRow = {
  id: string
}

const defaultNoteId = 'sqlite-poc-note-1'

export async function getAppliedSqlitePocMigrationIds(
  driver: SqlitePocDriver,
) {
  await driver.execute(sqlitePocSchemaMigrationsTableSql)

  const rows = await driver.query<MigrationRow>(
    'select id from schema_migrations order by id',
  )

  return rows.map((row) => row.id)
}

export async function applyPendingSqlitePocMigrations({
  driver,
  migrations = sqlitePocMigrations,
  now = () => new Date(),
}: {
  driver: SqlitePocDriver
  migrations?: readonly SqlitePocMigration[]
  now?: () => Date
}) {
  const appliedMigrationIds = new Set(
    await getAppliedSqlitePocMigrationIds(driver),
  )
  const newlyAppliedMigrationIds: string[] = []

  for (const migration of sortSqlitePocMigrations(migrations)) {
    if (appliedMigrationIds.has(migration.id)) {
      continue
    }

    for (const statement of migration.statements) {
      await driver.execute(statement)
    }

    await driver.execute(
      'insert into schema_migrations (id, applied_at) values (?, ?)',
      [migration.id, now().toISOString()],
    )
    newlyAppliedMigrationIds.push(migration.id)
  }

  return newlyAppliedMigrationIds
}

export async function getSqlitePocNoteById(
  driver: SqlitePocDriver,
  id: string,
) {
  const rows = await driver.query<SqlitePocNote>(
    'select id, title, created_at, updated_at from sqlite_poc_notes where id = ?',
    [id],
  )

  return rows[0] ?? null
}

export async function runSqlitePoc({
  driver,
  noteId = defaultNoteId,
  now = () => new Date(),
}: {
  driver: SqlitePocDriver
  noteId?: string
  now?: () => Date
}): Promise<SqlitePocRunResult> {
  const migrationIdsBeforeRun = await getAppliedSqlitePocMigrationIds(driver)
  const appliedMigrationIds = await applyPendingSqlitePocMigrations({
    driver,
    now,
  })
  const createdAt = now().toISOString()
  const inserted: SqlitePocNote = {
    created_at: createdAt,
    id: noteId,
    title: 'SQLite POC note',
    updated_at: createdAt,
  }

  await driver.execute(
    [
      'insert or replace into sqlite_poc_notes',
      '(id, title, created_at, updated_at)',
      'values (?, ?, ?, ?)',
    ].join(' '),
    [inserted.id, inserted.title, inserted.created_at, inserted.updated_at],
  )

  const queriedAfterInsert = await getSqlitePocNoteById(driver, noteId)
  const updatedAt = now().toISOString()

  await driver.execute(
    'update sqlite_poc_notes set title = ?, updated_at = ? where id = ?',
    ['SQLite POC note updated', updatedAt, noteId],
  )

  const queriedAfterUpdate = await getSqlitePocNoteById(driver, noteId)

  await driver.execute('delete from sqlite_poc_notes where id = ?', [noteId])

  return {
    appliedMigrationIds,
    deleted: (await getSqlitePocNoteById(driver, noteId)) === null,
    inserted,
    migrationIdsBeforeRun,
    queriedAfterInsert,
    queriedAfterUpdate,
    updated: queriedAfterUpdate?.title === 'SQLite POC note updated',
  }
}
