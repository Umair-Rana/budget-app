import type { Account } from '@/data/models/account'
import type { Bill } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { FinanceMetadataRecord } from '@/data/models/common'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'

export const backupAppName = 'Household Finance'
export const backupVersion = 1

export type BackupStores = {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  bills: Bill[]
  goals: Goal[]
  loans: Loan[]
  budgets: BudgetAllocation[]
  metadata: FinanceMetadataRecord[]
}

export type BackupStoreName = keyof BackupStores

export const backupStoreNames = [
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'metadata',
] as const satisfies readonly BackupStoreName[]

export type LocalBackupFile = {
  app: typeof backupAppName
  backupVersion: typeof backupVersion
  databaseVersion: number
  exportedAt: string
  currency: 'PKR'
  locale: 'en-PK'
  stores: BackupStores
}

export type BackupPreview = {
  app: string
  backupVersion: number
  databaseVersion: number
  exportedAt: string
  exportedAtLabel: string
  counts: {
    accounts: number
    categories: number
    transactions: number
    bills: number
    goals: number
    loans: number
    budgets: number
  }
}

export class BackupError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'BackupError'
    this.cause = cause
  }
}
