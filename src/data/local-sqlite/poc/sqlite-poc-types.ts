export type SqlitePocValue = string | number | null

export type SqlitePocParams = readonly SqlitePocValue[]

export interface SqlitePocNote {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SqlitePocMigration {
  id: string
  statements: readonly string[]
}

export interface SqlitePocDriver {
  close?: () => Promise<void>
  execute: (statement: string, params?: SqlitePocParams) => Promise<void>
  query: <TRow>(
    statement: string,
    params?: SqlitePocParams,
  ) => Promise<TRow[]>
}

export interface SqlitePocRunResult {
  appliedMigrationIds: string[]
  deleted: boolean
  inserted: SqlitePocNote
  migrationIdsBeforeRun: string[]
  queriedAfterInsert: SqlitePocNote | null
  queriedAfterUpdate: SqlitePocNote | null
  updated: boolean
}
