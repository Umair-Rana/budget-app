import { describe, expect, it } from 'vitest'

import { AndroidLocalSqliteDriver } from '@/data/local-sqlite/drivers/android-sqlite-driver'
import {
  createLocalSqliteDriver,
  getLocalSqlitePlatform,
} from '@/data/local-sqlite/drivers/create-local-sqlite-driver'
import { InMemoryLocalSqliteDriver } from '@/data/local-sqlite/drivers/memory-sqlite-driver'
import { getWebSqlitePersistenceMode } from '@/data/local-sqlite/drivers/web-sqlite-wasm-messages'
import { initializeLocalSqlite } from '@/data/local-sqlite/initialize-local-sqlite'
import { runLocalSqliteSmokeTest } from '@/data/local-sqlite/local-sqlite-smoke-test'

type FakeQueryResult = {
  values?: unknown[]
}

class FakeAndroidDb {
  closed = false
  executedSql: string[] = []
  queryCalls: Array<{ params: unknown[]; sql: string }> = []
  runCalls: Array<{ params: unknown[]; sql: string }> = []

  async close() {
    this.closed = true
  }

  async execute(sql: string) {
    this.executedSql.push(sql)
  }

  async query(sql: string, params: unknown[]): Promise<FakeQueryResult> {
    this.queryCalls.push({ params, sql })
    return { values: [{ id: 'row-1' }] }
  }

  async run(sql: string, params: unknown[]) {
    this.runCalls.push({ params, sql })
  }
}

class FakeSqliteConnection {
  closedConnections: Array<{ databaseName: string; readonly: boolean }> = []

  async closeConnection(databaseName: string, readonly: boolean) {
    this.closedConnections.push({ databaseName, readonly })
  }
}

describe('local SQLite drivers', () => {
  it('selects test platform before native/web detection', () => {
    expect(
      getLocalSqlitePlatform({ isNativePlatform: true, mode: 'test' }),
    ).toBe('test')
  })

  it('selects Android for native Capacitor platforms', () => {
    expect(
      getLocalSqlitePlatform({ isNativePlatform: true, mode: 'production' }),
    ).toBe('android')
  })

  it('selects Web for non-native platforms', () => {
    expect(
      getLocalSqlitePlatform({ isNativePlatform: false, mode: 'production' }),
    ).toBe('web')
  })

  it('creates an in-memory driver for the test platform', async () => {
    await expect(createLocalSqliteDriver({ platform: 'test' })).resolves.toBeInstanceOf(
      InMemoryLocalSqliteDriver,
    )
  })

  it('initializes a driver by running local migrations', async () => {
    const driver = new InMemoryLocalSqliteDriver()

    const initializedDriver = await initializeLocalSqlite({
      driver,
      now: () => new Date('2026-06-23T00:00:00.000Z'),
    })

    expect(initializedDriver).toBe(driver)
    expect(driver.appliedMigrations.has('0001_initial_local_sqlite_schema')).toBe(
      true,
    )
  })

  it('runs the local SQLite smoke flow against the driver contract', async () => {
    const result = await runLocalSqliteSmokeTest({
      allowOutsideDev: true,
      driver: new InMemoryLocalSqliteDriver(),
      now: () => new Date('2026-06-23T00:00:00.000Z'),
    })

    expect(result).toEqual({
      deleted: true,
      insertedRemoteCursor: 'inserted',
      updatedRemoteCursor: 'updated',
    })
  })

  it('maps Android driver parameters through run and query', async () => {
    const fakeDb = new FakeAndroidDb()
    const driver = new AndroidLocalSqliteDriver(
      new FakeSqliteConnection() as never,
      fakeDb as never,
      'test-db',
    )

    await driver.run('insert into t (id) values (?)', ['row-1'])
    const rows = await driver.query<{ id: string }>(
      'select id from t where id = ?',
      ['row-1'],
    )

    expect(fakeDb.runCalls).toEqual([
      { params: ['row-1'], sql: 'insert into t (id) values (?)' },
    ])
    expect(fakeDb.queryCalls).toEqual([
      { params: ['row-1'], sql: 'select id from t where id = ?' },
    ])
    expect(rows).toEqual([{ id: 'row-1' }])
  })

  it('commits Android transactions on success', async () => {
    const fakeDb = new FakeAndroidDb()
    const driver = new AndroidLocalSqliteDriver(
      new FakeSqliteConnection() as never,
      fakeDb as never,
      'test-db',
    )

    await expect(driver.transaction(async () => 'ok')).resolves.toBe('ok')

    expect(fakeDb.executedSql).toEqual(['begin transaction', 'commit'])
  })

  it('rolls back Android transactions on failure', async () => {
    const fakeDb = new FakeAndroidDb()
    const driver = new AndroidLocalSqliteDriver(
      new FakeSqliteConnection() as never,
      fakeDb as never,
      'test-db',
    )

    await expect(
      driver.transaction(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(fakeDb.executedSql).toEqual(['begin transaction', 'rollback'])
  })

  it('closes Android database connection safely once', async () => {
    const fakeDb = new FakeAndroidDb()
    const fakeSqlite = new FakeSqliteConnection()
    const driver = new AndroidLocalSqliteDriver(
      fakeSqlite as never,
      fakeDb as never,
      'test-db',
    )

    await driver.close()
    await driver.close()

    expect(fakeDb.closed).toBe(true)
    expect(fakeSqlite.closedConnections).toEqual([
      { databaseName: 'test-db', readonly: false },
    ])
  })

  it('models Web SQLite OPFS fallback mode', () => {
    expect(getWebSqlitePersistenceMode({ opfsAvailable: true })).toBe('opfs')
    expect(getWebSqlitePersistenceMode({ opfsAvailable: false })).toBe(
      'transient',
    )
  })
})
