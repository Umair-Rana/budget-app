import type { SqlitePocMigration } from '@/data/local-sqlite/poc/sqlite-poc-types'

export const sqlitePocSchemaMigrationsTableSql = `
create table if not exists schema_migrations (
  id text primary key,
  applied_at text not null
);
`.trim()

export const sqlitePocNotesTableSql = `
create table if not exists sqlite_poc_notes (
  id text primary key,
  title text not null,
  created_at text not null,
  updated_at text not null
);
`.trim()

export const sqlitePocMigrations = [
  {
    id: '0001_sqlite_poc_notes',
    statements: [sqlitePocNotesTableSql],
  },
] as const satisfies readonly SqlitePocMigration[]

export function sortSqlitePocMigrations(
  migrations: readonly SqlitePocMigration[],
) {
  return [...migrations].sort((first, second) =>
    first.id.localeCompare(second.id),
  )
}
