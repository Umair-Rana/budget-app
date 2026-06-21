import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { Account, AccountType } from '@/data/models/account'
import type { Bill, BillStatus } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category, CategoryType } from '@/data/models/category'
import type { FinanceMetadataRecord } from '@/data/models/common'
import type { Goal, GoalStatus } from '@/data/models/goal'
import type { Loan, LoanStatus, LoanType } from '@/data/models/loan'
import type { Transaction, TransactionType } from '@/data/models/transaction'

export const FINANCE_DB_NAME = 'household-finance-db'
export const FINANCE_DB_VERSION = 2

export interface FinanceDbSchema extends DBSchema {
  accounts: {
    key: string
    value: Account
    indexes: {
      'by-type': AccountType
      'by-deleted-at': string
      'by-archived-at': string
    }
  }
  categories: {
    key: string
    value: Category
    indexes: {
      'by-type': CategoryType
      'by-name': string
      'by-deleted-at': string
      'by-archived-at': string
    }
  }
  transactions: {
    key: string
    value: Transaction
    indexes: {
      'by-type': TransactionType
      'by-date': string
      'by-from-account': string
      'by-to-account': string
      'by-deleted-at': string
    }
  }
  bills: {
    key: string
    value: Bill
    indexes: {
      'by-status': BillStatus
      'by-due-date': string
      'by-category': string
      'by-deleted-at': string
    }
  }
  goals: {
    key: string
    value: Goal
    indexes: {
      'by-status': GoalStatus
      'by-target-date': string
      'by-deleted-at': string
    }
  }
  loans: {
    key: string
    value: Loan
    indexes: {
      'by-type': LoanType
      'by-status': LoanStatus
      'by-due-date': string
      'by-deleted-at': string
    }
  }
  budgets: {
    key: string
    value: BudgetAllocation
    indexes: {
      'by-month': string
      'by-category': string
      'by-month-category': [string, string]
      'by-deleted-at': string
      'by-archived-at': string
    }
  }
  metadata: {
    key: string
    value: FinanceMetadataRecord
  }
}

export type FinanceDb = IDBPDatabase<FinanceDbSchema>

let financeDbPromise: Promise<FinanceDb> | undefined
let financeDbName = FINANCE_DB_NAME

export function getFinanceDb() {
  financeDbPromise ??= openDB<FinanceDbSchema>(
    financeDbName,
    FINANCE_DB_VERSION,
    {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          const store = db.createObjectStore('accounts', { keyPath: 'id' })
          store.createIndex('by-type', 'type')
          store.createIndex('by-deleted-at', 'deletedAt')
          store.createIndex('by-archived-at', 'archivedAt')
        }

        if (!db.objectStoreNames.contains('categories')) {
          const store = db.createObjectStore('categories', { keyPath: 'id' })
          store.createIndex('by-type', 'type')
          store.createIndex('by-name', 'name')
          store.createIndex('by-deleted-at', 'deletedAt')
          store.createIndex('by-archived-at', 'archivedAt')
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' })
          store.createIndex('by-type', 'type')
          store.createIndex('by-date', 'date')
          store.createIndex('by-from-account', 'fromAccountId')
          store.createIndex('by-to-account', 'toAccountId')
          store.createIndex('by-deleted-at', 'deletedAt')
        }

        if (!db.objectStoreNames.contains('bills')) {
          const store = db.createObjectStore('bills', { keyPath: 'id' })
          store.createIndex('by-status', 'status')
          store.createIndex('by-due-date', 'dueDate')
          store.createIndex('by-category', 'categoryId')
          store.createIndex('by-deleted-at', 'deletedAt')
        }

        if (!db.objectStoreNames.contains('goals')) {
          const store = db.createObjectStore('goals', { keyPath: 'id' })
          store.createIndex('by-status', 'status')
          store.createIndex('by-target-date', 'targetDate')
          store.createIndex('by-deleted-at', 'deletedAt')
        }

        if (!db.objectStoreNames.contains('loans')) {
          const store = db.createObjectStore('loans', { keyPath: 'id' })
          store.createIndex('by-type', 'type')
          store.createIndex('by-status', 'status')
          store.createIndex('by-due-date', 'dueDate')
          store.createIndex('by-deleted-at', 'deletedAt')
        }

        if (!db.objectStoreNames.contains('budgets')) {
          const store = db.createObjectStore('budgets', { keyPath: 'id' })
          store.createIndex('by-month', 'month')
          store.createIndex('by-category', 'categoryId')
          store.createIndex('by-month-category', ['month', 'categoryId'])
          store.createIndex('by-deleted-at', 'deletedAt')
          store.createIndex('by-archived-at', 'archivedAt')
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      },
    },
  )

  return financeDbPromise
}

function deleteIndexedDb(databaseName: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)

    request.addEventListener('success', () => resolve())
    request.addEventListener('error', () => {
      reject(request.error ?? new Error(`Could not delete ${databaseName}.`))
    })
    request.addEventListener('blocked', () => resolve())
  })
}

async function closeFinanceDbForTests() {
  if (!financeDbPromise) {
    return
  }

  const db = await financeDbPromise

  db.close()
  financeDbPromise = undefined
}

export async function resetFinanceDbForTests(databaseName: string) {
  await closeFinanceDbForTests()
  financeDbName = databaseName
  await deleteIndexedDb(databaseName)
}

export async function cleanupFinanceDbForTests() {
  const databaseName = financeDbName

  await closeFinanceDbForTests()
  financeDbName = FINANCE_DB_NAME
  await deleteIndexedDb(databaseName)
}
