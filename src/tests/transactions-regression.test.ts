import { describe, expect, it } from 'vitest'

import { transactionsRepository } from '@/data/repositories/transactions/transactions-repository'
import {
  adjustmentDecreaseInput,
  adjustmentIncreaseInput,
  createFinanceFixture,
  expectAccountBalances,
  expectTransactionHidden,
  getStoredTransaction,
  normalExpenseInput,
  normalIncomeInput,
  transferInput,
} from '@/tests/finance-test-utils'

describe('transaction balance regression', () => {
  it('applies and reverses standalone transaction impacts', async () => {
    const fixture = await createFinanceFixture()

    const income = await transactionsRepository.create(
      normalIncomeInput(fixture, 8_000),
    )
    await expectAccountBalances(fixture.accounts, {
      bank: 58_000,
      cash: 100_000,
    })
    await transactionsRepository.archive(income.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    expectTransactionHidden(await getStoredTransaction(income.id))

    const expense = await transactionsRepository.create(
      normalExpenseInput(fixture, 6_000),
    )
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })
    await transactionsRepository.deleteSoft(expense.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    expectTransactionHidden(await getStoredTransaction(expense.id))

    const transfer = await transactionsRepository.create(
      transferInput(fixture, 9_000),
    )
    await expectAccountBalances(fixture.accounts, {
      bank: 59_000,
      cash: 91_000,
    })
    await transactionsRepository.archive(transfer.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    expectTransactionHidden(await getStoredTransaction(transfer.id))

    const adjustmentIncrease = await transactionsRepository.create(
      adjustmentIncreaseInput(fixture, 7_000),
    )
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 107_000,
    })
    await transactionsRepository.deleteSoft(adjustmentIncrease.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    expectTransactionHidden(await getStoredTransaction(adjustmentIncrease.id))

    const adjustmentDecrease = await transactionsRepository.create(
      adjustmentDecreaseInput(fixture, 5_000),
    )
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 95_000,
    })
    await transactionsRepository.archive(adjustmentDecrease.id)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    expectTransactionHidden(await getStoredTransaction(adjustmentDecrease.id))
  })

  it('keeps archived and deleted transactions out of active lists', async () => {
    const fixture = await createFinanceFixture()
    const archived = await transactionsRepository.create(
      normalIncomeInput(fixture, 1_000),
    )
    const deleted = await transactionsRepository.create(
      normalExpenseInput(fixture, 1_000),
    )

    await transactionsRepository.archive(archived.id)
    await transactionsRepository.deleteSoft(deleted.id)

    await expect(transactionsRepository.getAll()).resolves.toEqual([])
    await expect(
      transactionsRepository.getAll({ includeArchived: true }),
    ).resolves.toHaveLength(1)
    await expect(
      transactionsRepository.getAll({ includeDeleted: true }),
    ).resolves.toHaveLength(1)
  })
})
