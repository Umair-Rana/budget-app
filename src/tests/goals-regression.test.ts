import { describe, expect, it } from 'vitest'

import { indexedDbFinanceDataSource } from '@/data/data-source/finance-data-source'
import { getFinanceDb } from '@/data/db/finance-db'
import type { Goal } from '@/data/models/goal'
import { getMonthlyReport } from '@/data/reports/reports-queries'
import { goalsRepository } from '@/data/repositories/goals/goals-repository'
import {
  createFinanceFixture,
  expectAccountBalances,
  getActiveLinkedTransactions,
  testDate,
  testMonth,
} from '@/tests/finance-test-utils'

async function getStoredGoal(id: string) {
  const db = await getFinanceDb()
  const goal = await db.get('goals', id)

  if (!goal) {
    throw new Error(`Missing goal ${id}`)
  }

  return goal
}

async function createGoal() {
  return goalsRepository.create({
    currentAmount: 0,
    name: 'Emergency regression goal',
    priority: 'medium',
    targetAmount: 30_000,
    targetDate: '2026-12-31',
  })
}

async function addGoalMovements(
  goal: Goal,
  fixture: Awaited<ReturnType<typeof createFinanceFixture>>,
) {
  await goalsRepository.addContribution(goal.id, {
    amount: 7_000,
    date: testDate,
    sourceAccountId: fixture.accounts.cash.id,
  })
  await goalsRepository.withdraw(goal.id, {
    amount: 2_000,
    date: testDate,
    destinationAccountId: fixture.accounts.bank.id,
  })
}

describe('goal movement regression', () => {
  it('applies contribution and withdrawal account impacts', async () => {
    const fixture = await createFinanceFixture()
    const goal = await createGoal()

    await goalsRepository.addContribution(goal.id, {
      amount: 7_000,
      date: testDate,
      sourceAccountId: fixture.accounts.cash.id,
    })

    await expect(getStoredGoal(goal.id)).resolves.toMatchObject({
      currentAmount: 7_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 93_000,
    })

    await goalsRepository.withdraw(goal.id, {
      amount: 2_000,
      date: testDate,
      destinationAccountId: fixture.accounts.bank.id,
    })

    await expect(getStoredGoal(goal.id)).resolves.toMatchObject({
      currentAmount: 5_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 52_000,
      cash: 93_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedGoalId', goal.id),
    ).resolves.toHaveLength(2)
  })

  it.each([
    ['archive goal', (goal: Goal) => goalsRepository.archive(goal.id)],
    ['delete goal', (goal: Goal) => goalsRepository.deleteSoft(goal.id)],
  ])('%s reverses linked movement impacts', async (_label, action) => {
    const fixture = await createFinanceFixture()
    const goal = await createGoal()

    await addGoalMovements(goal, fixture)
    await expectAccountBalances(fixture.accounts, {
      bank: 52_000,
      cash: 93_000,
    })

    await action(goal)

    const storedGoal = await getStoredGoal(goal.id)

    expect(storedGoal.archivedAt ?? storedGoal.deletedAt).toBeTruthy()
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedGoalId', goal.id),
    ).resolves.toHaveLength(0)

    const report = await getMonthlyReport(testMonth, indexedDbFinanceDataSource)

    expect(report.goalActivityRows).toEqual([])
    expect(report.summaryMetrics.find((metric) => metric.key === 'income')).toMatchObject(
      {
        value: 'PKR 0',
      },
    )
    expect(report.summaryMetrics.find((metric) => metric.key === 'expenses')).toMatchObject(
      {
        value: 'PKR 0',
      },
    )
  })
})
