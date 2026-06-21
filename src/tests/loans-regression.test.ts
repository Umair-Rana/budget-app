import { describe, expect, it } from 'vitest'

import { indexedDbFinanceDataSource } from '@/data/data-source/finance-data-source'
import { getFinanceDb } from '@/data/db/finance-db'
import type { Loan } from '@/data/models/loan'
import { getMonthlyReport } from '@/data/reports/reports-queries'
import { loansRepository } from '@/data/repositories/loans/loans-repository'
import {
  createFinanceFixture,
  expectAccountBalances,
  getActiveLinkedTransactions,
  testDate,
  testMonth,
} from '@/tests/finance-test-utils'

async function getStoredLoan(id: string) {
  const db = await getFinanceDb()
  const loan = await db.get('loans', id)

  if (!loan) {
    throw new Error(`Missing loan ${id}`)
  }

  return loan
}

describe('loan movement regression', () => {
  it('handles loan given and repayment received', async () => {
    const fixture = await createFinanceFixture()
    const loan = await loansRepository.create({
      counterparty: 'Borrower',
      dueDate: '2026-12-31',
      name: 'Given regression loan',
      principalAmount: 10_000,
      sourceAccountId: fixture.accounts.cash.id,
      type: 'given',
    })

    await expect(getStoredLoan(loan.id)).resolves.toMatchObject({
      outstandingAmount: 10_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 90_000,
    })

    await loansRepository.recordPayment(loan.id, {
      accountId: fixture.accounts.bank.id,
      amount: 3_000,
      date: testDate,
    })

    await expect(getStoredLoan(loan.id)).resolves.toMatchObject({
      outstandingAmount: 7_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 53_000,
      cash: 90_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedLoanId', loan.id),
    ).resolves.toHaveLength(2)
  })

  it('handles loan taken and repayment made', async () => {
    const fixture = await createFinanceFixture()
    const loan = await loansRepository.create({
      counterparty: 'Lender',
      dueDate: '2026-12-31',
      name: 'Taken regression loan',
      principalAmount: 20_000,
      receivingAccountId: fixture.accounts.bank.id,
      type: 'taken',
    })

    await expect(getStoredLoan(loan.id)).resolves.toMatchObject({
      outstandingAmount: 20_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 70_000,
      cash: 100_000,
    })

    await loansRepository.recordPayment(loan.id, {
      accountId: fixture.accounts.cash.id,
      amount: 5_000,
      date: testDate,
    })

    await expect(getStoredLoan(loan.id)).resolves.toMatchObject({
      outstandingAmount: 15_000,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 70_000,
      cash: 95_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedLoanId', loan.id),
    ).resolves.toHaveLength(2)
  })

  it.each([
    ['archive loan', (loan: Loan) => loansRepository.archive(loan.id)],
    ['delete loan', (loan: Loan) => loansRepository.deleteSoft(loan.id)],
  ])('%s reverses linked movement impacts', async (_label, action) => {
    const fixture = await createFinanceFixture()
    const loan = await loansRepository.create({
      counterparty: 'Borrower',
      dueDate: '2026-12-31',
      name: 'Reversal regression loan',
      principalAmount: 10_000,
      sourceAccountId: fixture.accounts.cash.id,
      type: 'given',
    })

    await loansRepository.recordPayment(loan.id, {
      accountId: fixture.accounts.bank.id,
      amount: 3_000,
      date: testDate,
    })
    await expectAccountBalances(fixture.accounts, {
      bank: 53_000,
      cash: 90_000,
    })

    await action(loan)

    const storedLoan = await getStoredLoan(loan.id)

    expect(storedLoan.archivedAt ?? storedLoan.deletedAt).toBeTruthy()
    await expectAccountBalances(fixture.accounts, {
      bank: 50_000,
      cash: 100_000,
    })
    await expect(
      getActiveLinkedTransactions('linkedLoanId', loan.id),
    ).resolves.toHaveLength(0)

    const report = await getMonthlyReport(testMonth, indexedDbFinanceDataSource)

    expect(report.loanActivityRows).toEqual([])
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
