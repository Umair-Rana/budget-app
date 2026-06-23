import { createLocalSqliteDriver } from '@/data/local-sqlite/drivers/create-local-sqlite-driver'
import type {
  LocalSqliteDriver,
  LocalSqliteMigration,
} from '@/data/local-sqlite/local-sqlite-types'
import { runLocalSqliteMigrations } from '@/data/local-sqlite/migration-runner'

export type InitializeLocalSqliteOptions = {
  createDriver?: () => Promise<LocalSqliteDriver>
  driver?: LocalSqliteDriver
  migrations?: readonly LocalSqliteMigration[]
  now?: () => Date
}

export async function initializeLocalSqlite({
  createDriver = createLocalSqliteDriver,
  driver,
  migrations,
  now,
}: InitializeLocalSqliteOptions = {}) {
  const sqliteDriver = driver ?? (await createDriver())

  try {
    await runLocalSqliteMigrations({
      driver: sqliteDriver,
      migrations,
      now,
    })

    return sqliteDriver
  } catch (error) {
    await sqliteDriver.close?.()
    throw error
  }
}
