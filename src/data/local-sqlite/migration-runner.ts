import {
  localSqliteMigrations,
  sortLocalSqliteMigrations,
} from '@/data/local-sqlite/migrations'
import { localSchemaMigrationsTableSql } from '@/data/local-sqlite/schema/local-sqlite-schema'
import type {
  AppliedMigration,
  LocalSqliteDriver,
  LocalSqliteMigration,
  MigrationResult,
} from '@/data/local-sqlite/local-sqlite-types'

export async function ensureLocalSchemaMigrationsTable(
  driver: LocalSqliteDriver,
) {
  await driver.exec(localSchemaMigrationsTableSql)
}

export async function getAppliedLocalSqliteMigrations(
  driver: LocalSqliteDriver,
) {
  await ensureLocalSchemaMigrationsTable(driver)

  return driver.query<AppliedMigration>(
    'select id, applied_at from schema_migrations order by id',
  )
}

export async function runLocalSqliteMigrations({
  driver,
  migrations = localSqliteMigrations,
  now = () => new Date(),
}: {
  driver: LocalSqliteDriver
  migrations?: readonly LocalSqliteMigration[]
  now?: () => Date
}): Promise<MigrationResult> {
  const appliedMigrations = await getAppliedLocalSqliteMigrations(driver)
  const previouslyAppliedMigrationIds = appliedMigrations.map(
    (migration) => migration.id,
  )
  const appliedMigrationIdSet = new Set(previouslyAppliedMigrationIds)
  const pendingMigrations = sortLocalSqliteMigrations(migrations).filter(
    (migration) => !appliedMigrationIdSet.has(migration.id),
  )
  const appliedMigrationIds: string[] = []

  if (pendingMigrations.length > 0) {
    await driver.transaction(async () => {
      for (const migration of pendingMigrations) {
        for (const statement of migration.statements) {
          await driver.exec(statement)
        }

        await driver.run(
          'insert into schema_migrations (id, applied_at) values (?, ?)',
          [migration.id, now().toISOString()],
        )
        appliedMigrationIds.push(migration.id)
      }
    })
  }

  return {
    appliedMigrationIds,
    pendingMigrationIds: pendingMigrations.map((migration) => migration.id),
    previouslyAppliedMigrationIds,
  }
}
