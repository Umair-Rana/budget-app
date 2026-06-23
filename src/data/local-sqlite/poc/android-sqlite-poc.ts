import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

import { runSqlitePoc } from '@/data/local-sqlite/poc/sqlite-poc-runner'
import type {
  SqlitePocDriver,
  SqlitePocParams,
} from '@/data/local-sqlite/poc/sqlite-poc-types'

const androidPocDatabaseName = 'household_finance_sqlite_poc'

function rowsFromResult<TRow>(result: {
  values?: unknown[]
}) {
  return (result.values ?? []) as TRow[]
}

export async function createAndroidSqlitePocDriver(
  databaseName = androidPocDatabaseName,
): Promise<SqlitePocDriver> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Android SQLite POC requires a native Capacitor platform.')
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite)
  const existingConnection = await sqlite.isConnection(databaseName, false)
  const db: SQLiteDBConnection = existingConnection.result
    ? await sqlite.retrieveConnection(databaseName, false)
    : await sqlite.createConnection(
        databaseName,
        false,
        'no-encryption',
        1,
        false,
      )

  await db.open()

  return {
    async close() {
      await db.close()
      await sqlite.closeConnection(databaseName, false)
    },
    async execute(statement: string, params?: SqlitePocParams) {
      if (params && params.length > 0) {
        await db.run(statement, [...params])
        return
      }

      await db.execute(statement)
    },
    async query<TRow>(
      statement: string,
      params?: SqlitePocParams,
    ) {
      return rowsFromResult<TRow>(
        await db.query(statement, params ? [...params] : []),
      )
    },
  }
}

export async function runAndroidSqlitePoc() {
  const driver = await createAndroidSqlitePocDriver()

  try {
    return await runSqlitePoc({ driver })
  } finally {
    await driver.close?.()
  }
}
