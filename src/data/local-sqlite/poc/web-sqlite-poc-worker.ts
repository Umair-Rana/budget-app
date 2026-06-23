import sqlite3InitModule, {
  type Database,
  type SqlValue,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm'

import { runSqlitePoc } from '@/data/local-sqlite/poc/sqlite-poc-runner'
import type {
  SqlitePocDriver,
  SqlitePocParams,
  SqlitePocRunResult,
} from '@/data/local-sqlite/poc/sqlite-poc-types'

type WebSqlitePocSuccessMessage = {
  databasePath: string
  opfsAvailable: boolean
  result: SqlitePocRunResult
  type: 'success'
}

type WebSqlitePocErrorMessage = {
  message: string
  type: 'error'
}

export type WebSqlitePocWorkerMessage =
  | WebSqlitePocErrorMessage
  | WebSqlitePocSuccessMessage

const webPocDatabasePath = '/household-finance-sqlite-poc.sqlite3'

function toSqlValues(params?: SqlitePocParams): SqlValue[] | undefined {
  return params ? [...params] : undefined
}

function createWebSqlitePocDriver(db: Database): SqlitePocDriver {
  return {
    async close() {
      db.close()
    },
    async execute(statement: string, params?: SqlitePocParams) {
      db.exec({
        bind: toSqlValues(params),
        sql: statement,
      })
    },
    async query<TRow>(statement: string, params?: SqlitePocParams) {
      return db.exec({
        bind: toSqlValues(params),
        returnValue: 'resultRows',
        rowMode: 'object',
        sql: statement,
      }) as unknown as TRow[]
    },
  }
}

function createWebSqlitePocDatabase(sqlite3: Sqlite3Static) {
  const OpfsDb = sqlite3.oo1.OpfsDb

  if (OpfsDb) {
    return {
      db: new OpfsDb(webPocDatabasePath, 'ct'),
      opfsAvailable: true,
    }
  }

  return {
    db: new sqlite3.oo1.DB(webPocDatabasePath, 'ct'),
    opfsAvailable: false,
  }
}

async function runWebSqlitePocInWorker() {
  const sqlite3 = await sqlite3InitModule()
  const { db, opfsAvailable } = createWebSqlitePocDatabase(sqlite3)
  const driver = createWebSqlitePocDriver(db)

  try {
    return {
      databasePath: webPocDatabasePath,
      opfsAvailable,
      result: await runSqlitePoc({ driver }),
    } satisfies Omit<WebSqlitePocSuccessMessage, 'type'>
  } finally {
    await driver.close?.()
  }
}

self.addEventListener('message', async () => {
  try {
    const result = await runWebSqlitePocInWorker()
    self.postMessage({
      ...result,
      type: 'success',
    } satisfies WebSqlitePocSuccessMessage)
  } catch (error) {
    self.postMessage({
      message: error instanceof Error ? error.message : String(error),
      type: 'error',
    } satisfies WebSqlitePocErrorMessage)
  }
})
