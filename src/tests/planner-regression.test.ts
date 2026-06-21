import { describe, expect, it } from 'vitest'

import { indexedDbFinanceDataSource } from '@/data/data-source/finance-data-source'
import { getFinanceDb } from '@/data/db/finance-db'
import { getPlannerWorkspace } from '@/data/planner/planner-queries'
import { budgetsRepository } from '@/data/repositories/budgets/budgets-repository'
import { transactionsRepository } from '@/data/repositories/transactions/transactions-repository'
import {
  createFinanceFixture,
  expectAccountBalances,
  expectBudgetHidden,
  getStoredBudget,
  normalExpenseInput,
  testMonth,
} from '@/tests/finance-test-utils'

describe('planner budget regression', () => {
  it('blocks duplicate active month/category allocations but allows editing itself', async () => {
    const fixture = await createFinanceFixture()
    const budget = await budgetsRepository.create({
      categoryId: fixture.categories.groceries.id,
      group: 'needs',
      month: testMonth,
      plannedAmount: 10_000,
    })

    await expect(
      budgetsRepository.create({
        categoryId: fixture.categories.groceries.id,
        group: 'needs',
        month: testMonth,
        plannedAmount: 12_000,
      }),
    ).rejects.toThrow(/already exists|Duplicate/i)

    await expect(
      budgetsRepository.update(budget.id, {
        notes: 'Edited without tripping duplicate validation',
        plannedAmount: 11_000,
      }),
    ).resolves.toMatchObject({
      notes: 'Edited without tripping duplicate validation',
      plannedAmount: 11_000,
    })
  })

  it('archive/delete does not mutate accounts, transactions, or categories', async () => {
    const fixture = await createFinanceFixture()
    const transaction = await transactionsRepository.create(
      normalExpenseInput(fixture, 6_000),
    )
    const db = await getFinanceDb()
    const categoriesBefore = await db.getAll('categories')
    const budget = await budgetsRepository.create({
      categoryId: fixture.categories.groceries.id,
      group: 'needs',
      month: testMonth,
      plannedAmount: 10_000,
    })

    let planner = await getPlannerWorkspace(testMonth, indexedDbFinanceDataSource)

    expect(planner.budgetRows).toHaveLength(1)
    expect(planner.summary.actualTotal).toBe(6_000)
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })

    await budgetsRepository.archive(budget.id)

    planner = await getPlannerWorkspace(testMonth, indexedDbFinanceDataSource)

    expect(planner.budgetRows).toHaveLength(0)
    expect(planner.unplannedSpendingRows).toEqual([
      expect.objectContaining({
        actualAmount: 6_000,
        categoryName: 'Groceries',
      }),
    ])
    expect(planner.summary.actualTotal).toBe(6_000)
    expectBudgetHidden(await getStoredBudget(budget.id))
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })
    const storedTransaction = await db.get('transactions', transaction.id)

    expect(storedTransaction).toMatchObject({ id: transaction.id })
    expect(storedTransaction?.archivedAt).toBeUndefined()
    expect(storedTransaction?.deletedAt).toBeUndefined()
    await expect(db.getAll('categories')).resolves.toEqual(categoriesBefore)

    const deletedBudget = await budgetsRepository.create({
      categoryId: fixture.categories.internet.id,
      group: 'needs',
      month: testMonth,
      plannedAmount: 5_000,
    })

    await budgetsRepository.deleteSoft(deletedBudget.id)

    expectBudgetHidden(await getStoredBudget(deletedBudget.id))
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 94_000,
    })
  })
})
