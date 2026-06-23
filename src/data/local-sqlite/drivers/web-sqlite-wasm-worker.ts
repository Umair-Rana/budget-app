import sqlite3InitModule, {
  type Database,
  type SqlValue,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm'

import type { LocalSqliteStatementParams } from '@/data/local-sqlite/local-sqlite-types'
import {
  getWebSqlitePersistenceMode,
  type WebSqliteDriverStatus,
  type WebSqliteWorkerRequest,
  type WebSqliteWorkerResponse,
} from '@/data/local-sqlite/drivers/web-sqlite-wasm-messages'

const defaultWebDatabasePath = '/household-finance-local.sqlite3'

let databaseStatePromise: Promise<{
  db: Database
  status: WebSqliteDriverStatus
}> | null = null

function toSqlValues(params?: LocalSqliteStatementParams): SqlValue[] | undefined {
  return params ? ([...params] as SqlValue[]) : undefined
}

function createTransientDatabase(sqlite3: Sqlite3Static, opfsError?: unknown) {
  const opfsErrorMessage =
    opfsError instanceof Error ? opfsError.message : undefined

  return {
    db: new sqlite3.oo1.DB(defaultWebDatabasePath, 'ct'),
    status: {
      databasePath: defaultWebDatabasePath,
      opfsErrorMessage,
      persistenceMode: getWebSqlitePersistenceMode({ opfsAvailable: false }),
    } satisfies WebSqliteDriverStatus,
  }
}

async function createDatabaseState() {
  const sqlite3 = await sqlite3InitModule()
  const OpfsDb = sqlite3.oo1.OpfsDb

  if (!OpfsDb) {
    return createTransientDatabase(sqlite3)
  }

  try {
    return {
      db: new OpfsDb(defaultWebDatabasePath, 'ct'),
      status: {
        databasePath: defaultWebDatabasePath,
        persistenceMode: getWebSqlitePersistenceMode({ opfsAvailable: true }),
      } satisfies WebSqliteDriverStatus,
    }
  } catch (error) {
    return createTransientDatabase(sqlite3, error)
  }
}

async function getDatabaseState() {
  databaseStatePromise ??= createDatabaseState()
  return databaseStatePromise
}

async function closeDatabase() {
  if (!databaseStatePromise) {
    return
  }

  const { db } = await databaseStatePromise
  db.close()
  databaseStatePromise = null
}

async function handleRequest(request: WebSqliteWorkerRequest) {
  if (request.type === 'close') {
    await closeDatabase()
    return undefined
  }

  const { db, status } = await getDatabaseState()

  if (request.type === 'status') {
    return status
  }

  if (request.type === 'query') {
    return db.exec({
      bind: toSqlValues(request.params),
      returnValue: 'resultRows',
      rowMode: 'object',
      sql: request.sql,
    })
  }

  if (request.type === 'exec' || request.type === 'run') {
    db.exec({
      bind: toSqlValues(request.params),
      sql: request.sql,
    })
  }

  return undefined
}

self.addEventListener('message', async (event) => {
  const request = event.data as WebSqliteWorkerRequest

  try {
    const result = await handleRequest(request)
    const response: WebSqliteWorkerResponse =
      request.type === 'status'
        ? {
            id: request.id,
            status: result as WebSqliteDriverStatus,
            type: 'success',
          }
        : {
            id: request.id,
            result,
            type: 'success',
          }

    self.postMessage(response)
  } catch (error) {
    self.postMessage({
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
      type: 'error',
    } satisfies WebSqliteWorkerResponse)
  }
})
