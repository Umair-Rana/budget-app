import { describe, expect, it } from 'vitest'

import { indexedDbFinanceDataSource } from '@/data/data-source/finance-data-source'
import { getFinanceDb } from '@/data/db/finance-db'
import type { Bill } from '@/data/models/bill'
import { getMonthlyReport } from '@/data/reports/reports-queries'
import { billsRepository } from '@/data/repositories/bills/bills-repository'
import { transactionsRepository } from '@/data/repositories/transactions/transactions-repository'
import {
  createFinanceFixture,
  expectAccountBalances,
  getActiveLinkedTransactions,
  getDeletedLinkedTransactions,
  testDate,
  testMonth,
} from '@/tests/finance-test-utils'

async function getStoredBill(id: string) {
  const db = await getFinanceDb()
  const bill = await db.get('bills', id)

  if (!bill) {
    throw new Error(`Missing bill ${id}`)
  }

  return bill
}

async function createBill(fixture: Awaited<ReturnType<typeof createFinanceFixture>>) {
  return billsRepository.create({
    amount: 3_000,
    categoryId: fixture.categories.internet.id,
    dueDate: '2026-06-28',
    frequency: 'monthly',
    name: 'Internet regression bill',
  })
}

describe('bill linked payment regression', () => {
  it('marks paid, creates a linked expense, and marks unpaid safely', async () => {
    const fixture = await createFinanceFixture()
    const bill = await createBill(fixture)

    await billsRepository.markPaid(bill.id, {
      paymentAccountId: fixture.accounts.cash.id,
      paymentDate: testDate,
    })

    const paidBill = await getStoredBill(bill.id)

    expect(paidBill.status).toBe('paid')
    expect(paidBill.linkedTransactionId).toBeTruthy()
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 97_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedBillId', bill.id),
    ).resolves.toHaveLength(1)

    await expect(
      transactionsRepository.update(paidBill.linkedTransactionId!, {
        notes: 'blocked direct edit',
      }),
    ).rejects.toThrow(/Linked transactions/)
    await expect(
      transactionsRepository.archive(paidBill.linkedTransactionId!),
    ).rejects.toThrow(/Linked transactions/)
    await expect(
      transactionsRepository.deleteSoft(paidBill.linkedTransactionId!),
    ).rejects.toThrow(/Linked transactions/)

    await billsRepository.markUnpaid(bill.id)

    const unpaidBill = await getStoredBill(bill.id)

    expect(unpaidBill.status).not.toBe('paid')
    expect(unpaidBill.paymentAccountId).toBeUndefined()
    expect(unpaidBill.linkedTransactionId).toBeUndefined()
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedBillId', bill.id),
    ).resolves.toHaveLength(0)
    await expect(
      getDeletedLinkedTransactions('linkedBillId', bill.id),
    ).resolves.toHaveLength(1)

    const report = await getMonthlyReport(testMonth, indexedDbFinanceDataSource)

    expect(report.billsPaidRows).toEqual([])
    expect(report.summaryMetrics.find((metric) => metric.key === 'expenses')).toMatchObject(
      {
        value: 'PKR 0',
      },
    )
  })

  it.each([
    ['archive paid bill', (bill: Bill) => billsRepository.archive(bill.id)],
    ['delete paid bill', (bill: Bill) => billsRepository.deleteSoft(bill.id)],
  ])('%s reverses payment impact', async (_label, action) => {
    const fixture = await createFinanceFixture()
    const bill = await createBill(fixture)

    await billsRepository.markPaid(bill.id, {
      paymentAccountId: fixture.accounts.cash.id,
      paymentDate: testDate,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 97_000,
    })

    await action(bill)

    const storedBill = await getStoredBill(bill.id)

    expect(storedBill.archivedAt ?? storedBill.deletedAt).toBeTruthy()
    expect(storedBill.paymentAccountId).toBeUndefined()
    expect(storedBill.linkedTransactionId).toBeUndefined()
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedBillId', bill.id),
    ).resolves.toHaveLength(0)
  })
})
