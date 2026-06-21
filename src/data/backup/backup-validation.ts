import { FINANCE_DB_VERSION } from '@/data/db/finance-db'
import {
  BackupError,
  backupAppName,
  backupStoreNames,
  backupVersion,
  type BackupPreview,
  type LocalBackupFile,
} from '@/data/backup/backup-types'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isSupportedCategoryType(value: string) {
  return ['income', 'expense', 'adjustment'].includes(value.toLowerCase())
}

function optionalString(value: unknown) {
  return value === undefined || isString(value)
}

function hasBaseFinanceRecord(value: UnknownRecord) {
  return (
    isString(value.id) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    optionalString(value.archivedAt) &&
    optionalString(value.deletedAt)
  )
}

function isAccountRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.name) &&
    isString(value.type) &&
    isString(value.icon) &&
    isString(value.color) &&
    value.currency === 'PKR' &&
    isNumber(value.openingBalance) &&
    isNumber(value.currentBalance)
  )
}

function isCategoryRecord(value: unknown) {
  const error = getCategoryRecordValidationError(value)

  return !error
}

function isTransactionRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.type) &&
    isNumber(value.amount) &&
    isString(value.date)
  )
}

function isBillRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.name) &&
    isNumber(value.amount) &&
    isString(value.categoryId) &&
    isString(value.dueDate) &&
    isString(value.status) &&
    isString(value.frequency)
  )
}

function isGoalRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.name) &&
    isNumber(value.targetAmount) &&
    isNumber(value.currentAmount) &&
    isString(value.priority) &&
    isString(value.status)
  )
}

function isLoanRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.name) &&
    isString(value.type) &&
    isNumber(value.principalAmount) &&
    isNumber(value.outstandingAmount) &&
    isString(value.status)
  )
}

function isBudgetRecord(value: unknown) {
  return (
    isRecord(value) &&
    hasBaseFinanceRecord(value) &&
    isString(value.month) &&
    isString(value.categoryId) &&
    isNumber(value.plannedAmount)
  )
}

function isMetadataRecord(value: unknown) {
  return (
    isRecord(value) &&
    isString(value.key) &&
    isString(value.value) &&
    isString(value.updatedAt)
  )
}

function missingRequiredField(fieldName: string) {
  return `missing required field "${fieldName}"`
}

function invalidOptionalField(fieldName: string, expectedType: string) {
  return `optional field "${fieldName}" must be ${expectedType}`
}

function getCategoryRecordValidationError(value: unknown) {
  if (!isRecord(value)) {
    return 'record must be an object'
  }

  if (!isString(value.id)) {
    return missingRequiredField('id')
  }

  if (!isString(value.name)) {
    return missingRequiredField('name')
  }

  if (!isString(value.type)) {
    return missingRequiredField('type')
  }

  if (!isSupportedCategoryType(value.type)) {
    return `unsupported category type "${value.type}"`
  }

  value.type = value.type.toLowerCase()

  if (value.icon !== undefined && !isString(value.icon)) {
    return invalidOptionalField('icon', 'a string')
  }

  if (value.color !== undefined && !isString(value.color)) {
    return invalidOptionalField('color', 'a string')
  }

  if (value.isDefault !== undefined && !isBoolean(value.isDefault)) {
    return invalidOptionalField('isDefault', 'a boolean')
  }

  if (value.isDefault === undefined) {
    value.isDefault = false
  }

  if (value.createdAt !== undefined && !isString(value.createdAt)) {
    return invalidOptionalField('createdAt', 'a string')
  }

  if (value.updatedAt !== undefined && !isString(value.updatedAt)) {
    return invalidOptionalField('updatedAt', 'a string')
  }

  if (!optionalString(value.archivedAt)) {
    return invalidOptionalField('archivedAt', 'a string')
  }

  if (!optionalString(value.deletedAt)) {
    return invalidOptionalField('deletedAt', 'a string')
  }

  if (!optionalString(value.defaultKey)) {
    return invalidOptionalField('defaultKey', 'a string')
  }

  return undefined
}

function assertArrayStore(
  stores: UnknownRecord,
  storeName: string,
  itemGuard: (value: unknown) => boolean,
  getValidationError?: (value: unknown) => string | undefined,
) {
  const store = stores[storeName]

  if (!Array.isArray(store)) {
    throw new BackupError(`Missing required data: ${storeName}.`)
  }

  const invalidIndex = store.findIndex((item) => !itemGuard(item))

  if (invalidIndex >= 0) {
    const validationError = getValidationError?.(store[invalidIndex])

    throw new BackupError(
      `Invalid backup file: ${storeName}[${invalidIndex}] is invalid${
        validationError ? `: ${validationError}` : ': unsupported record'
      }.`,
    )
  }
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new BackupError('Invalid backup file: JSON could not be parsed.', error)
  }
}

export function validateBackupPayload(payload: unknown): LocalBackupFile {
  if (!isRecord(payload)) {
    throw new BackupError('Invalid backup file.')
  }

  if (payload.app !== backupAppName) {
    throw new BackupError(
      'Invalid backup file: this backup is not from Household Finance.',
    )
  }

  if (payload.backupVersion !== backupVersion) {
    throw new BackupError('Backup version not supported.')
  }

  if (
    !isNumber(payload.databaseVersion) ||
    payload.databaseVersion > FINANCE_DB_VERSION
  ) {
    throw new BackupError('Backup database version not supported.')
  }

  if (!isString(payload.exportedAt) || Number.isNaN(Date.parse(payload.exportedAt))) {
    throw new BackupError('Invalid backup file: export date is missing.')
  }

  if (payload.currency !== 'PKR' || payload.locale !== 'en-PK') {
    throw new BackupError('Invalid backup file: locale metadata is unsupported.')
  }

  if (!isRecord(payload.stores)) {
    throw new BackupError('Missing required data: stores.')
  }

  for (const storeName of backupStoreNames) {
    if (!(storeName in payload.stores)) {
      throw new BackupError(`Missing required data: ${storeName}.`)
    }
  }

  assertArrayStore(payload.stores, 'accounts', isAccountRecord)
  assertArrayStore(
    payload.stores,
    'categories',
    isCategoryRecord,
    getCategoryRecordValidationError,
  )
  assertArrayStore(payload.stores, 'transactions', isTransactionRecord)
  assertArrayStore(payload.stores, 'bills', isBillRecord)
  assertArrayStore(payload.stores, 'goals', isGoalRecord)
  assertArrayStore(payload.stores, 'loans', isLoanRecord)
  assertArrayStore(payload.stores, 'budgets', isBudgetRecord)
  assertArrayStore(payload.stores, 'metadata', isMetadataRecord)

  return payload as LocalBackupFile
}

export function parseBackupJson(text: string) {
  return validateBackupPayload(parseJson(text))
}

export async function parseBackupFile(file: File) {
  return parseBackupJson(await file.text())
}

export function createBackupPreview(backup: LocalBackupFile): BackupPreview {
  return {
    app: backup.app,
    backupVersion: backup.backupVersion,
    databaseVersion: backup.databaseVersion,
    exportedAt: backup.exportedAt,
    exportedAtLabel: new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(backup.exportedAt)),
    counts: {
      accounts: backup.stores.accounts.length,
      categories: backup.stores.categories.length,
      transactions: backup.stores.transactions.length,
      bills: backup.stores.bills.length,
      goals: backup.stores.goals.length,
      loans: backup.stores.loans.length,
      budgets: backup.stores.budgets.length,
    },
  }
}
