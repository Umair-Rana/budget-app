import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'

export const localAndroidSqliteDatabaseName = 'household_finance_local'

function toSqliteParams(params?: LocalSqliteStatementParams) {
  return params ? [...params] : []
}

function rowsFromResult<TRow>(result: { values?: unknown[] }) {
  return (result.values ?? []) as TRow[]
}

export class AndroidLocalSqliteDriver implements LocalSqliteDriver {
  private isClosed = false
  private readonly databaseName: string
  private readonly db: SQLiteDBConnection
  private readonly sqlite: SQLiteConnection

  constructor(
    sqlite: SQLiteConnection,
    db: SQLiteDBConnection,
    databaseName: string,
  ) {
    this.databaseName = databaseName
    this.db = db
    this.sqlite = sqlite
  }

  async close() {
    if (this.isClosed) {
      return
    }

    await this.db.close()
    await this.sqlite.closeConnection(this.databaseName, false)
    this.isClosed = true
  }

  async exec(sql: string) {
    await this.db.execute(sql)
  }

  async query<T>(sql: string, params?: LocalSqliteStatementParams) {
    return rowsFromResult<T>(await this.db.query(sql, toSqliteParams(params)))
  }

  async run(sql: string, params?: LocalSqliteStatementParams) {
    await this.db.run(sql, toSqliteParams(params))
  }

  async transaction<T>(work: () => Promise<T>) {
    await this.exec('begin transaction')

    try {
      const result = await work()
      await this.exec('commit')
      return result
    } catch (error) {
      await this.exec('rollback')
      throw error
    }
  }
}

export async function createAndroidLocalSqliteDriver({
  databaseName = localAndroidSqliteDatabaseName,
}: {
  databaseName?: string
} = {}) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Android SQLite driver requires a native Capacitor platform.')
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite)
  const existingConnection = await sqlite.isConnection(databaseName, false)
  const db = existingConnection.result
    ? await sqlite.retrieveConnection(databaseName, false)
    : await sqlite.createConnection(
        databaseName,
        false,
        'no-encryption',
        1,
        false,
      )

  await db.open()

  return new AndroidLocalSqliteDriver(sqlite, db, databaseName)
}
