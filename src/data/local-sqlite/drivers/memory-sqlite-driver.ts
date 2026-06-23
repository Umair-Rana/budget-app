import type {
  AppliedMigration,
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import { localSchemaMigrationsTableSql } from '@/data/local-sqlite/schema/local-sqlite-schema'

type LocalSyncMetadataRow = {
  created_at: string
  entity_type: string
  household_id: string
  id: string
  last_pulled_at: string | null
  last_pushed_at: string | null
  remote_cursor: string | null
  updated_at: string
}

export class InMemoryLocalSqliteDriver implements LocalSqliteDriver {
  appliedMigrations = new Map<string, string>()
  executedSql: string[] = []
  localSyncMetadata = new Map<string, LocalSyncMetadataRow>()
  transactionDepth = 0

  async close() {
    return undefined
  }

  async exec(sql: string) {
    this.executedSql.push(sql)
  }

  async query<T>(sql: string, params: LocalSqliteStatementParams = []) {
    const normalizedSql = sql.toLowerCase()

    if (normalizedSql.includes('from schema_migrations')) {
      return [...this.appliedMigrations.entries()]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([id, applied_at]) => ({ applied_at, id })) as unknown as T[]
    }

    if (normalizedSql.includes('from local_sync_metadata')) {
      const id = String(params[0])
      const row = this.localSyncMetadata.get(id)
      return (row ? [row] : []) as unknown as T[]
    }

    return []
  }

  async run(sql: string, params: LocalSqliteStatementParams = []) {
    const normalizedSql = sql.toLowerCase()

    if (normalizedSql.startsWith('insert into schema_migrations')) {
      this.appliedMigrations.set(String(params[0]), String(params[1]))
      return
    }

    if (
      normalizedSql.startsWith('insert into local_sync_metadata') ||
      normalizedSql.startsWith('insert or replace into local_sync_metadata')
    ) {
      this.localSyncMetadata.set(String(params[0]), {
        created_at: String(params[4]),
        entity_type: String(params[2]),
        household_id: String(params[1]),
        id: String(params[0]),
        last_pulled_at: null,
        last_pushed_at: null,
        remote_cursor: String(params[3]),
        updated_at: String(params[5]),
      })
      return
    }

    if (normalizedSql.startsWith('update local_sync_metadata')) {
      const id = String(params[2])
      const current = this.localSyncMetadata.get(id)

      if (current) {
        this.localSyncMetadata.set(id, {
          ...current,
          remote_cursor: String(params[0]),
          updated_at: String(params[1]),
        })
      }

      return
    }

    if (normalizedSql.startsWith('delete from local_sync_metadata')) {
      this.localSyncMetadata.delete(String(params[0]))
    }
  }

  async transaction<T>(work: () => Promise<T>) {
    this.transactionDepth += 1

    try {
      return await work()
    } finally {
      this.transactionDepth -= 1
    }
  }
}

export function createInMemoryLocalSqliteDriver() {
  return new InMemoryLocalSqliteDriver()
}

export function seedInMemoryAppliedMigrations(
  driver: InMemoryLocalSqliteDriver,
  migrations: readonly AppliedMigration[],
) {
  for (const migration of migrations) {
    driver.appliedMigrations.set(migration.id, migration.applied_at)
  }

  driver.executedSql.push(localSchemaMigrationsTableSql)
}
