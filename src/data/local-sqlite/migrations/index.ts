import { initialLocalSqliteSchemaMigration } from '@/data/local-sqlite/migrations/0001_initial_local_sqlite_schema'
import type { LocalSqliteMigration } from '@/data/local-sqlite/local-sqlite-types'

export const localSqliteMigrations = [
  initialLocalSqliteSchemaMigration,
] as const satisfies readonly LocalSqliteMigration[]

export function sortLocalSqliteMigrations(
  migrations: readonly LocalSqliteMigration[],
) {
  return [...migrations].sort((first, second) =>
    first.id.localeCompare(second.id),
  )
}
