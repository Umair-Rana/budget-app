import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'

export const localSqliteWriteNotImplementedMessage =
  'Local SQLite write operations are not implemented yet.'

export type LocalSqliteRepositoryContext = {
  driver: LocalSqliteDriver
  householdId: string
}

export function throwLocalSqliteWriteNotImplemented(): never {
  throw new Error(localSqliteWriteNotImplementedMessage)
}

export function visibilityWhereClause(options?: RepositoryListOptions) {
  const clauses: string[] = []

  if (!options?.includeDeleted) {
    clauses.push('deleted_at is null')
  }

  if (!options?.includeArchived) {
    clauses.push('archived_at is null')
  }

  return clauses
}

export async function listLocalRows<TRow>({
  context,
  orderBy = 'created_at',
  options,
  table,
}: {
  context: LocalSqliteRepositoryContext
  options?: RepositoryListOptions
  orderBy?: string
  table: string
}) {
  const clauses = ['household_id = ?', ...visibilityWhereClause(options)]
  return context.driver.query<TRow>(
    `select * from ${table} where ${clauses.join(' and ')} order by ${orderBy}`,
    [context.householdId],
  )
}

export async function getLocalRowById<TRow>({
  context,
  id,
  options,
  table,
}: {
  context: LocalSqliteRepositoryContext
  id: string
  options?: RepositoryListOptions
  table: string
}) {
  const clauses = ['household_id = ?', 'id = ?', ...visibilityWhereClause(options)]
  const rows = await context.driver.query<TRow>(
    `select * from ${table} where ${clauses.join(' and ')} limit 1`,
    [context.householdId, id],
  )

  return rows[0]
}
