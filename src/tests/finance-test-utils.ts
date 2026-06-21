import { expect } from 'vitest'

import { getFinanceDb } from '@/data/db/finance-db'
import type { Account } from '@/data/models/account'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import type {
  CreateTransactionInput,
  Transaction,
} from '@/data/models/transaction'
import { accountsRepository } from '@/data/repositories/accounts/accounts-repository'
import { categoriesRepository } from '@/data/repositories/categories/categories-repository'

export const testDate = '2026-06-21'
export const testMonth = '2026-06'

export type FinanceFixture = {
  accounts: {
    bank: Account
    cash: Account
  }
  categories: {
    correction: Category
    groceries: Category
    internet: Category
    salary: Category
  }
}

function findCategory(
  categories: Category[],
  name: string,
  type: Category['type'],
) {
  const category = categories.find(
    (item) =>
      item.name === name &&
      item.type === type &&
      !item.archivedAt &&
      !item.deletedAt,
  )

  if (!category) {
    throw new Error(`Missing default ${type} category: ${name}`)
  }

  return category
}

export async function createFinanceFixture(): Promise<FinanceFixture> {
  await categoriesRepository.seedDefaultsIfNeeded()

  const categories = await categoriesRepository.getAll({
    includeArchived: true,
  })
  const cash = await accountsRepository.create({
    name: 'Test Cash',
    type: 'cash',
    icon: 'banknote',
    color: '#047857',
    openingBalance: 100_000,
  })
  const bank = await accountsRepository.create({
    name: 'Test Bank',
    type: 'bank',
    icon: 'landmark',
    color: '#2563eb',
    openingBalance: 50_000,
  })

  return {
    accounts: {
      bank,
      cash,
    },
    categories: {
      correction: findCategory(categories, 'Correction', 'adjustment'),
      groceries: findCategory(categories, 'Groceries', 'expense'),
      internet: findCategory(categories, 'Internet', 'expense'),
      salary: findCategory(categories, 'Salary', 'income'),
    },
  }
}

export async function getStoredAccount(id: EntityId) {
  const db = await getFinanceDb()
  const account = await db.get('accounts', id)

  if (!account) {
    throw new Error(`Missing account ${id}`)
  }

  return account
}

export async function expectAccountBalances(
  accounts: FinanceFixture['accounts'],
  expected: {
    bank: number
    cash: number
  },
) {
  await expect(getStoredAccount(accounts.cash.id)).resolves.toMatchObject({
    currentBalance: expected.cash,
  })
  await expect(getStoredAccount(accounts.bank.id)).resolves.toMatchObject({
    currentBalance: expected.bank,
  })
}

export async function getStoredTransactions() {
  const db = await getFinanceDb()

  return db.getAll('transactions')
}

export async function getActiveTransactions() {
  return (await getStoredTransactions()).filter(
    (transaction) => !transaction.archivedAt && !transaction.deletedAt,
  )
}

export async function getActiveLinkedTransactions(
  field: 'linkedBillId' | 'linkedGoalId' | 'linkedLoanId',
  linkedId: EntityId,
) {
  return (await getActiveTransactions()).filter(
    (transaction) => transaction[field] === linkedId,
  )
}

export async function getDeletedLinkedTransactions(
  field: 'linkedBillId' | 'linkedGoalId' | 'linkedLoanId',
  linkedId: EntityId,
) {
  return (await getStoredTransactions()).filter(
    (transaction) => transaction[field] === linkedId && transaction.deletedAt,
  )
}

export async function getStoredTransaction(id: EntityId) {
  const db = await getFinanceDb()
  const transaction = await db.get('transactions', id)

  if (!transaction) {
    throw new Error(`Missing transaction ${id}`)
  }

  return transaction
}

export async function getStoredBudget(id: EntityId) {
  const db = await getFinanceDb()
  const budget = await db.get('budgets', id)

  if (!budget) {
    throw new Error(`Missing budget ${id}`)
  }

  return budget
}

export async function getStoreCounts() {
  const db = await getFinanceDb()

  return {
    accounts: (await db.getAll('accounts')).length,
    bills: (await db.getAll('bills')).length,
    budgets: (await db.getAll('budgets')).length,
    categories: (await db.getAll('categories')).length,
    goals: (await db.getAll('goals')).length,
    loans: (await db.getAll('loans')).length,
    metadata: (await db.getAll('metadata')).length,
    transactions: (await db.getAll('transactions')).length,
  }
}

export function normalIncomeInput(fixture: FinanceFixture, amount: number) {
  return {
    amount,
    categoryId: fixture.categories.salary.id,
    date: testDate,
    time: '09:00',
    toAccountId: fixture.accounts.bank.id,
    type: 'income',
  } satisfies CreateTransactionInput
}

export function normalExpenseInput(fixture: FinanceFixture, amount: number) {
  return {
    amount,
    categoryId: fixture.categories.groceries.id,
    date: testDate,
    fromAccountId: fixture.accounts.cash.id,
    time: '10:00',
    type: 'expense',
  } satisfies CreateTransactionInput
}

export function transferInput(fixture: FinanceFixture, amount: number) {
  return {
    amount,
    date: testDate,
    fromAccountId: fixture.accounts.cash.id,
    time: '11:00',
    toAccountId: fixture.accounts.bank.id,
    type: 'transfer',
  } satisfies CreateTransactionInput
}

export function adjustmentIncreaseInput(
  fixture: FinanceFixture,
  amount: number,
) {
  return {
    amount,
    categoryId: fixture.categories.correction.id,
    date: testDate,
    time: '12:00',
    toAccountId: fixture.accounts.cash.id,
    type: 'adjustment',
  } satisfies CreateTransactionInput
}

export function adjustmentDecreaseInput(
  fixture: FinanceFixture,
  amount: number,
) {
  return {
    amount,
    categoryId: fixture.categories.correction.id,
    date: testDate,
    fromAccountId: fixture.accounts.cash.id,
    time: '12:30',
    type: 'adjustment',
  } satisfies CreateTransactionInput
}

export function expectTransactionHidden(transaction: Transaction) {
  expect(transaction.archivedAt ?? transaction.deletedAt).toBeTruthy()
}

export function expectBudgetHidden(budget: BudgetAllocation) {
  expect(budget.archivedAt ?? budget.deletedAt).toBeTruthy()
}
