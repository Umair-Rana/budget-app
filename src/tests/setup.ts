import 'fake-indexeddb/auto'

import { afterEach, beforeEach } from 'vitest'

import {
  cleanupFinanceDbForTests,
  resetFinanceDbForTests,
} from '@/data/db/finance-db'

let testDatabaseCounter = 0

beforeEach(async () => {
  testDatabaseCounter += 1

  await resetFinanceDbForTests(
    `household-finance-test-${Date.now()}-${testDatabaseCounter}`,
  )
})

afterEach(async () => {
  await cleanupFinanceDbForTests()
})
