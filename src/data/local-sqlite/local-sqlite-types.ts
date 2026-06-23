export type LocalSqliteStatementParams = readonly unknown[]

export interface LocalSqliteDriver {
  exec(sql: string): Promise<void>
  query<T>(sql: string, params?: LocalSqliteStatementParams): Promise<T[]>
  run(sql: string, params?: LocalSqliteStatementParams): Promise<void>
  transaction<T>(work: () => Promise<T>): Promise<T>
}

export interface LocalSqliteMigration {
  id: string
  statements: readonly string[]
}

export interface AppliedMigration {
  id: string
  applied_at: string
}

export interface MigrationResult {
  appliedMigrationIds: string[]
  pendingMigrationIds: string[]
  previouslyAppliedMigrationIds: string[]
}
