import { describe, expect, it } from 'vitest'

import {
  sortSqlitePocMigrations,
  sqlitePocMigrations,
  sqlitePocNotesTableSql,
  sqlitePocSchemaMigrationsTableSql,
} from '@/data/local-sqlite/poc/sqlite-poc-schema'
import {
  applyPendingSqlitePocMigrations,
  runSqlitePoc,
} from '@/data/local-sqlite/poc/sqlite-poc-runner'
import type {
  SqlitePocDriver,
  SqlitePocMigration,
  SqlitePocNote,
  SqlitePocParams,
} from '@/data/local-sqlite/poc/sqlite-poc-types'

class MockSqlitePocDriver implements SqlitePocDriver {
  executedStatements: string[] = []
  migrations = new Map<string, string>()
  notes = new Map<string, SqlitePocNote>()

  async execute(statement: string, params: SqlitePocParams = []) {
    this.executedStatements.push(statement)
    const normalizedStatement = statement.toLowerCase()

    if (normalizedStatement.startsWith('insert into schema_migrations')) {
      this.migrations.set(String(params[0]), String(params[1]))
      return
    }

    if (
      normalizedStatement.startsWith('insert or replace into sqlite_poc_notes')
    ) {
      this.notes.set(String(params[0]), {
        created_at: String(params[2]),
        id: String(params[0]),
        title: String(params[1]),
        updated_at: String(params[3]),
      })
      return
    }

    if (normalizedStatement.startsWith('update sqlite_poc_notes')) {
      const existingNote = this.notes.get(String(params[2]))

      if (existingNote) {
        this.notes.set(existingNote.id, {
          ...existingNote,
          title: String(params[0]),
          updated_at: String(params[1]),
        })
      }

      return
    }

    if (normalizedStatement.startsWith('delete from sqlite_poc_notes')) {
      this.notes.delete(String(params[0]))
    }
  }

  async query<TRow>(
    statement: string,
    params: SqlitePocParams = [],
  ) {
    const normalizedStatement = statement.toLowerCase()

    if (normalizedStatement.includes('from schema_migrations')) {
      return [...this.migrations.keys()]
        .sort((first, second) => first.localeCompare(second))
        .map((id) => ({ id })) as unknown as TRow[]
    }

    if (normalizedStatement.includes('from sqlite_poc_notes')) {
      const note = this.notes.get(String(params[0]))
      return (note ? [note] : []) as unknown as TRow[]
    }

    return []
  }
}

describe('SQLite POC', () => {
  it('defines the isolated POC schema and migration table', () => {
    expect(sqlitePocSchemaMigrationsTableSql).toContain('schema_migrations')
    expect(sqlitePocNotesTableSql).toContain('sqlite_poc_notes')
    expect(sqlitePocNotesTableSql).toContain('id text primary key')
    expect(sqlitePocMigrations).toHaveLength(1)
    expect(sqlitePocMigrations[0].id).toBe('0001_sqlite_poc_notes')
  })

  it('sorts migrations by ID before applying them', () => {
    const migrations: SqlitePocMigration[] = [
      { id: '0002_second', statements: ['select 2'] },
      { id: '0001_first', statements: ['select 1'] },
    ]

    expect(sortSqlitePocMigrations(migrations).map((migration) => migration.id))
      .toEqual(['0001_first', '0002_second'])
  })

  it('applies each pending migration once', async () => {
    const driver = new MockSqlitePocDriver()

    const firstRun = await applyPendingSqlitePocMigrations({ driver })
    const secondRun = await applyPendingSqlitePocMigrations({ driver })

    expect(firstRun).toEqual(['0001_sqlite_poc_notes'])
    expect(secondRun).toEqual([])
    expect(driver.migrations.has('0001_sqlite_poc_notes')).toBe(true)
  })

  it('runs insert, query, update, delete through the driver contract', async () => {
    const driver = new MockSqlitePocDriver()
    const result = await runSqlitePoc({
      driver,
      now: () => new Date('2026-06-23T00:00:00.000Z'),
    })

    expect(result.appliedMigrationIds).toEqual(['0001_sqlite_poc_notes'])
    expect(result.queriedAfterInsert?.title).toBe('SQLite POC note')
    expect(result.updated).toBe(true)
    expect(result.queriedAfterUpdate?.title).toBe('SQLite POC note updated')
    expect(result.deleted).toBe(true)
    expect(driver.notes.size).toBe(0)
  })
})
