import { describe, expect, it } from 'vitest'

import type {
  AppliedMigration,
  LocalSqliteDriver,
  LocalSqliteMigration,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import {
  getAppliedLocalSqliteMigrations,
  runLocalSqliteMigrations,
} from '@/data/local-sqlite/migration-runner'
import {
  localSqliteMigrations,
  sortLocalSqliteMigrations,
} from '@/data/local-sqlite/migrations'
import { initialLocalSqliteSchemaMigration } from '@/data/local-sqlite/migrations/0001_initial_local_sqlite_schema'
import {
  localFinanceTableSql,
  localFinanceTables,
  localHouseholdOwnedTables,
  localInfrastructureTableSql,
  localInfrastructureTables,
  localSchemaMigrationsTableSql,
  localSoftDeleteTables,
  localSqliteIndexSql,
  localUpdatedAtTables,
} from '@/data/local-sqlite/schema/local-sqlite-schema'

class MockLocalSqliteDriver implements LocalSqliteDriver {
  appliedMigrations = new Map<string, string>()
  executedSql: string[] = []
  ranSql: Array<{ params?: LocalSqliteStatementParams; sql: string }> = []
  schemaMigrationsTableCreated = false
  transactionCount = 0

  async exec(sql: string) {
    this.executedSql.push(sql)

    if (sql === localSchemaMigrationsTableSql) {
      this.schemaMigrationsTableCreated = true
    }
  }

  async query<T>(sql: string) {
    if (!this.schemaMigrationsTableCreated) {
      throw new Error('schema_migrations table does not exist')
    }

    if (sql.toLowerCase().includes('from schema_migrations')) {
      return [...this.appliedMigrations.entries()]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([id, applied_at]) => ({ applied_at, id })) as unknown as T[]
    }

    return []
  }

  async run(sql: string, params?: LocalSqliteStatementParams) {
    this.ranSql.push({ params, sql })

    if (sql.toLowerCase().startsWith('insert into schema_migrations')) {
      this.appliedMigrations.set(String(params?.[0]), String(params?.[1]))
    }
  }

  async transaction<T>(work: () => Promise<T>) {
    this.transactionCount += 1
    return work()
  }
}

function allTableSql() {
  return {
    ...localFinanceTableSql,
    ...localInfrastructureTableSql,
    schema_migrations: localSchemaMigrationsTableSql,
  }
}

function expectColumn(sql: string, column: string) {
  expect(sql.toLowerCase()).toContain(`${column.toLowerCase()} `)
}

describe('local SQLite migration foundation', () => {
  it('sorts migrations by ID', () => {
    const migrations: LocalSqliteMigration[] = [
      { id: '0002_second', statements: ['select 2'] },
      { id: '0001_first', statements: ['select 1'] },
    ]

    expect(sortLocalSqliteMigrations(migrations).map(({ id }) => id)).toEqual([
      '0001_first',
      '0002_second',
    ])
  })

  it('creates schema_migrations before reading applied migrations', async () => {
    const driver = new MockLocalSqliteDriver()

    const applied = await getAppliedLocalSqliteMigrations(driver)

    expect(applied).toEqual([])
    expect(driver.schemaMigrationsTableCreated).toBe(true)
    expect(driver.executedSql).toContain(localSchemaMigrationsTableSql)
  })

  it('applies pending migrations once and records them after success', async () => {
    const driver = new MockLocalSqliteDriver()

    const firstRun = await runLocalSqliteMigrations({
      driver,
      now: () => new Date('2026-06-23T00:00:00.000Z'),
    })
    const secondRun = await runLocalSqliteMigrations({ driver })

    expect(firstRun.appliedMigrationIds).toEqual([
      '0001_initial_local_sqlite_schema',
    ])
    expect(firstRun.pendingMigrationIds).toEqual([
      '0001_initial_local_sqlite_schema',
    ])
    expect(firstRun.previouslyAppliedMigrationIds).toEqual([])
    expect(secondRun.appliedMigrationIds).toEqual([])
    expect(secondRun.pendingMigrationIds).toEqual([])
    expect(secondRun.previouslyAppliedMigrationIds).toEqual([
      '0001_initial_local_sqlite_schema',
    ])
    expect(driver.transactionCount).toBe(1)
    expect(
      driver.ranSql.some(({ sql }) =>
        sql.toLowerCase().startsWith('insert into schema_migrations'),
      ),
    ).toBe(true)
  })

  it('exposes the first real local SQLite migration', () => {
    expect(localSqliteMigrations).toEqual([initialLocalSqliteSchemaMigration])
    expect(initialLocalSqliteSchemaMigration.id).toBe(
      '0001_initial_local_sqlite_schema',
    )
    expect(initialLocalSqliteSchemaMigration.statements.length).toBeGreaterThan(
      localFinanceTables.length + localInfrastructureTables.length,
    )
  })

  it('creates all required finance and infrastructure tables', () => {
    const schemaSql = initialLocalSqliteSchemaMigration.statements.join('\n')

    for (const tableName of [
      ...localFinanceTables,
      ...localInfrastructureTables,
    ]) {
      expect(schemaSql).toContain(`create table if not exists ${tableName}`)
    }
  })

  it('includes practical indexes for future sync and query performance', () => {
    const indexSql = localSqliteIndexSql.join('\n')

    expect(indexSql).toContain('idx_transactions_household_id')
    expect(indexSql).toContain('idx_transactions_updated_at')
    expect(indexSql).toContain('idx_transactions_deleted_at')
    expect(indexSql).toContain('idx_transactions_account_id')
    expect(indexSql).toContain('idx_transactions_category_id')
    expect(indexSql).toContain('idx_transactions_transaction_date')
    expect(indexSql).toContain('idx_bills_due_date')
    expect(indexSql).toContain('idx_operation_queue_status')
    expect(indexSql).toContain('idx_operation_queue_created_at')
    expect(indexSql).toContain('idx_operation_queue_idempotency_key')
  })

  it('defines the operation queue foundation fields', () => {
    const sql = localInfrastructureTableSql.operation_queue

    for (const column of [
      'id',
      'household_id',
      'operation_type',
      'entity_type',
      'entity_id',
      'payload_json',
      'status',
      'attempt_count',
      'idempotency_key',
      'last_error',
      'created_at',
      'updated_at',
      'next_retry_at',
    ]) {
      expectColumn(sql, column)
    }

    expect(sql).toContain('attempt_count integer not null default 0')
    expect(sql).toContain('payload_json text not null')
  })

  it('keeps household-owned tables scoped by household_id', () => {
    const tables = allTableSql()

    for (const tableName of localHouseholdOwnedTables) {
      expectColumn(tables[tableName], 'household_id')
      expect(tables[tableName]).toContain('household_id text not null')
    }
  })

  it('keeps sync-aware tables updated_at tracked', () => {
    const tables = allTableSql()

    for (const tableName of localUpdatedAtTables) {
      expectColumn(tables[tableName], 'updated_at')
      expect(tables[tableName]).toContain('updated_at text not null')
    }
  })

  it('keeps finance tables soft-delete ready', () => {
    const tables = allTableSql()

    for (const tableName of localSoftDeleteTables) {
      expectColumn(tables[tableName], 'deleted_at')
    }
  })

  it('returns applied migration records in order', async () => {
    const driver = new MockLocalSqliteDriver()
    driver.schemaMigrationsTableCreated = true
    driver.appliedMigrations.set('0002_second', '2026-06-23T00:01:00.000Z')
    driver.appliedMigrations.set('0001_first', '2026-06-23T00:00:00.000Z')

    const rows = await getAppliedLocalSqliteMigrations(driver)

    expect(rows).toEqual([
      {
        applied_at: '2026-06-23T00:00:00.000Z',
        id: '0001_first',
      },
      {
        applied_at: '2026-06-23T00:01:00.000Z',
        id: '0002_second',
      },
    ] satisfies AppliedMigration[])
  })
})
