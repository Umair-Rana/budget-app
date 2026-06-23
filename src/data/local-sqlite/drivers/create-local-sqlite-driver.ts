import { Capacitor } from '@capacitor/core'

import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'

export type LocalSqlitePlatform = 'android' | 'test' | 'web'

export type CreateLocalSqliteDriverOptions = {
  platform?: LocalSqlitePlatform
}

export function getLocalSqlitePlatform({
  isNativePlatform = Capacitor.isNativePlatform(),
  mode = import.meta.env.MODE,
}: {
  isNativePlatform?: boolean
  mode?: string
} = {}): LocalSqlitePlatform {
  if (mode === 'test') {
    return 'test'
  }

  return isNativePlatform ? 'android' : 'web'
}

export async function createLocalSqliteDriver({
  platform = getLocalSqlitePlatform(),
}: CreateLocalSqliteDriverOptions = {}): Promise<LocalSqliteDriver> {
  if (platform === 'test') {
    const { createInMemoryLocalSqliteDriver } = await import(
      '@/data/local-sqlite/drivers/memory-sqlite-driver'
    )

    return createInMemoryLocalSqliteDriver()
  }

  if (platform === 'android') {
    const { createAndroidLocalSqliteDriver } = await import(
      '@/data/local-sqlite/drivers/android-sqlite-driver'
    )

    return createAndroidLocalSqliteDriver()
  }

  const { createWebLocalSqliteWasmDriver } = await import(
    '@/data/local-sqlite/drivers/web-sqlite-wasm-driver'
  )

  return createWebLocalSqliteWasmDriver()
}
