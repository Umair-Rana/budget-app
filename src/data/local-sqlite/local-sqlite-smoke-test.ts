import { initializeLocalSqlite } from '@/data/local-sqlite/initialize-local-sqlite'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'

export type LocalSqliteSmokeTestResult = {
  deleted: boolean
  insertedRemoteCursor: string | null
  updatedRemoteCursor: string | null
}

type LocalSqliteSmokeRow = {
  remote_cursor: string | null
}

export async function runLocalSqliteSmokeTest({
  allowOutsideDev = false,
  closeDriver = true,
  driver,
  initialize = initializeLocalSqlite,
  now = () => new Date(),
}: {
  allowOutsideDev?: boolean
  closeDriver?: boolean
  driver?: LocalSqliteDriver
  initialize?: (options?: { driver?: LocalSqliteDriver }) => Promise<LocalSqliteDriver>
  now?: () => Date
} = {}): Promise<LocalSqliteSmokeTestResult> {
  if (!import.meta.env.DEV && !allowOutsideDev) {
    throw new Error('Local SQLite smoke test is development-only.')
  }

  const sqliteDriver = await initialize({ driver })
  const smokeId = 'local-sqlite-smoke-test'
  const timestamp = now().toISOString()

  try {
    await sqliteDriver.run(
      [
        'insert or replace into local_sync_metadata',
        '(id, household_id, entity_type, remote_cursor, created_at, updated_at)',
        'values (?, ?, ?, ?, ?, ?)',
      ].join(' '),
      [
        smokeId,
        'local-sqlite-smoke-household',
        'smoke_test',
        'inserted',
        timestamp,
        timestamp,
      ],
    )

    const insertedRows = await sqliteDriver.query<LocalSqliteSmokeRow>(
      'select remote_cursor from local_sync_metadata where id = ?',
      [smokeId],
    )

    const updatedAt = now().toISOString()

    await sqliteDriver.run(
      'update local_sync_metadata set remote_cursor = ?, updated_at = ? where id = ?',
      ['updated', updatedAt, smokeId],
    )

    const updatedRows = await sqliteDriver.query<LocalSqliteSmokeRow>(
      'select remote_cursor from local_sync_metadata where id = ?',
      [smokeId],
    )

    await sqliteDriver.run('delete from local_sync_metadata where id = ?', [
      smokeId,
    ])

    const rowsAfterDelete = await sqliteDriver.query<LocalSqliteSmokeRow>(
      'select remote_cursor from local_sync_metadata where id = ?',
      [smokeId],
    )

    return {
      deleted: rowsAfterDelete.length === 0,
      insertedRemoteCursor: insertedRows[0]?.remote_cursor ?? null,
      updatedRemoteCursor: updatedRows[0]?.remote_cursor ?? null,
    }
  } finally {
    if (closeDriver) {
      await sqliteDriver.close?.()
    }
  }
}
