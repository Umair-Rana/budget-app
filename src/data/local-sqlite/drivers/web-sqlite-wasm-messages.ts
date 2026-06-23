import type { LocalSqliteStatementParams } from '@/data/local-sqlite/local-sqlite-types'

export type WebSqlitePersistenceMode = 'opfs' | 'transient'

export type WebSqliteDriverStatus = {
  databasePath: string
  opfsErrorMessage?: string
  persistenceMode: WebSqlitePersistenceMode
}

export type WebSqliteWorkerRequest =
  | {
      id: number
      params?: LocalSqliteStatementParams
      sql: string
      type: 'exec' | 'query' | 'run'
    }
  | {
      id: number
      type: 'close' | 'status'
    }

export type WebSqliteWorkerResponse =
  | {
      id: number
      result?: unknown
      status?: WebSqliteDriverStatus
      type: 'success'
    }
  | {
      id: number
      message: string
      type: 'error'
    }

export function getWebSqlitePersistenceMode({
  opfsAvailable,
}: {
  opfsAvailable: boolean
}): WebSqlitePersistenceMode {
  return opfsAvailable ? 'opfs' : 'transient'
}
