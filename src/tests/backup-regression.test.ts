import { describe, expect, it } from 'vitest'

import {
  createBackupPreview,
  parseBackupJson,
  validateBackupPayload,
} from '@/data/backup/backup-validation'
import { createLocalBackup } from '@/data/backup/backup-export'
import { restoreBackupFullReplace } from '@/data/backup/backup-import'
import { transactionsRepository } from '@/data/repositories/transactions/transactions-repository'
import {
  createFinanceFixture,
  expectAccountBalances,
  getStoreCounts,
  normalExpenseInput,
  normalIncomeInput,
} from '@/tests/finance-test-utils'

describe('backup regression', () => {
  it('exports all stores and validates legitimate category records', async () => {
    await createFinanceFixture()

    const backup = await createLocalBackup()
    const parsed = parseBackupJson(JSON.stringify(backup))
    const preview = createBackupPreview(parsed)

    expect(Object.keys(backup.stores).sort()).toEqual(
      [
        'accounts',
        'bills',
        'budgets',
        'categories',
        'goals',
        'loans',
        'metadata',
        'transactions',
      ].sort(),
    )
    expect(parsed.stores.categories.length).toBeGreaterThan(0)
    expect(preview.counts.categories).toBe(parsed.stores.categories.length)
  })

  it('rejects invalid JSON and invalid backup shapes', async () => {
    expect(() => parseBackupJson('{ invalid json')).toThrow(/could not be parsed/i)
    expect(() => validateBackupPayload({})).toThrow(/Household Finance/i)
  })

  it('restores an exported backup after destructive changes', async () => {
    const fixture = await createFinanceFixture()

    await transactionsRepository.create(normalExpenseInput(fixture, 6_000))
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })

    const backup = await createLocalBackup()
    const countsBefore = await getStoreCounts()
    const income = await transactionsRepository.create(
      normalIncomeInput(fixture, 1_234),
    )

    await transactionsRepository.deleteSoft(income.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })

    await restoreBackupFullReplace(backup)

    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })
    await expect(getStoreCounts()).resolves.toEqual(countsBefore)
  })
})
