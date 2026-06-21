import type { IsoDateString } from '@/data/models/common'
import type {
  CreateRecurringTransactionInput,
  RecurringTransaction,
  RecurringTransactionFrequency,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import type { CreateTransactionInput } from '@/data/models/transaction'
import { RepositoryError } from '@/data/repositories/common/repository-errors'

export const recurringTransactionFrequencyValues = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const

export function getTodayDateString(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateParts(date: IsoDateString) {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    throw new RepositoryError('Date must use YYYY-MM-DD format.')
  }

  return { year, month, day }
}

function formatDate(year: number, monthIndex: number, day: number) {
  const date = new Date(year, monthIndex, day)
  const formattedYear = date.getFullYear()
  const formattedMonth = String(date.getMonth() + 1).padStart(2, '0')
  const formattedDay = String(date.getDate()).padStart(2, '0')

  return `${formattedYear}-${formattedMonth}-${formattedDay}`
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function calculateNextRunDate(
  scheduledDate: IsoDateString,
  frequency: RecurringTransactionFrequency,
  interval: number,
): IsoDateString {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new RepositoryError('Interval must be at least 1.')
  }

  const { year, month, day } = parseDateParts(scheduledDate)
  const monthIndex = month - 1

  if (frequency === 'daily') {
    return formatDate(year, monthIndex, day + interval)
  }

  if (frequency === 'weekly') {
    return formatDate(year, monthIndex, day + interval * 7)
  }

  if (frequency === 'monthly') {
    const targetMonthIndex = monthIndex + interval
    const targetYear = year + Math.floor(targetMonthIndex / 12)
    const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12
    const nextDay = Math.min(
      day,
      daysInMonth(targetYear, normalizedMonthIndex),
    )

    return formatDate(targetYear, normalizedMonthIndex, nextDay)
  }

  const targetYear = year + interval
  const nextDay = Math.min(day, daysInMonth(targetYear, monthIndex))

  return formatDate(targetYear, monthIndex, nextDay)
}

export function isRecurringTransactionDue(
  recurringTransaction: RecurringTransaction,
  asOfDate: IsoDateString = getTodayDateString(),
) {
  if (
    !recurringTransaction.isActive ||
    recurringTransaction.archivedAt ||
    recurringTransaction.deletedAt
  ) {
    return false
  }

  if (
    recurringTransaction.endDate &&
    recurringTransaction.nextRunDate > recurringTransaction.endDate
  ) {
    return false
  }

  return recurringTransaction.nextRunDate <= asOfDate
}

function assertDate(value: string | undefined, label: string) {
  if (!value?.trim()) {
    throw new RepositoryError(`${label} is required.`)
  }

  parseDateParts(value)
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

export function sanitizeRecurringTransactionInput(
  input: CreateRecurringTransactionInput,
): CreateRecurringTransactionInput {
  return {
    ...input,
    name: input.name.trim(),
    notes: normalizeOptional(input.notes),
    categoryId: normalizeOptional(input.categoryId),
    fromAccountId: normalizeOptional(input.fromAccountId),
    toAccountId: normalizeOptional(input.toAccountId),
    endDate: normalizeOptional(input.endDate),
    interval: Math.trunc(input.interval),
    isActive: input.isActive ?? true,
  }
}

export function validateRecurringTransactionInput(
  input: CreateRecurringTransactionInput,
) {
  const values = sanitizeRecurringTransactionInput(input)

  if (!values.name) {
    throw new RepositoryError('Name is required.')
  }

  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    throw new RepositoryError('Amount must be greater than 0.')
  }

  if (!recurringTransactionFrequencyValues.includes(values.frequency)) {
    throw new RepositoryError('Frequency is required.')
  }

  if (!Number.isInteger(values.interval) || values.interval < 1) {
    throw new RepositoryError('Interval must be at least 1.')
  }

  assertDate(values.startDate, 'Start date')
  assertDate(values.nextRunDate, 'Next run date')

  if (values.endDate) {
    assertDate(values.endDate, 'End date')

    if (values.endDate < values.startDate) {
      throw new RepositoryError('End date cannot be before start date.')
    }
  }

  if (values.nextRunDate < values.startDate) {
    throw new RepositoryError('Next run date cannot be before start date.')
  }

  if (values.type === 'income') {
    if (!values.categoryId) {
      throw new RepositoryError('Income category is required.')
    }

    if (!values.toAccountId) {
      throw new RepositoryError('Destination account is required.')
    }
  }

  if (values.type === 'expense') {
    if (!values.categoryId) {
      throw new RepositoryError('Expense category is required.')
    }

    if (!values.fromAccountId) {
      throw new RepositoryError('Source account is required.')
    }
  }

  if (values.type === 'transfer') {
    if (!values.fromAccountId) {
      throw new RepositoryError('Source account is required.')
    }

    if (!values.toAccountId) {
      throw new RepositoryError('Destination account is required.')
    }

    if (values.fromAccountId === values.toAccountId) {
      throw new RepositoryError('Transfer accounts must be different.')
    }
  }

  return values
}

export function mergeRecurringTransactionInput(
  current: RecurringTransaction,
  input: UpdateRecurringTransactionInput,
): CreateRecurringTransactionInput {
  return {
    type: input.type ?? current.type,
    name: input.name ?? current.name,
    amount: input.amount ?? current.amount,
    categoryId: 'categoryId' in input ? input.categoryId : current.categoryId,
    fromAccountId:
      'fromAccountId' in input ? input.fromAccountId : current.fromAccountId,
    toAccountId: 'toAccountId' in input ? input.toAccountId : current.toAccountId,
    frequency: input.frequency ?? current.frequency,
    interval: input.interval ?? current.interval,
    startDate: input.startDate ?? current.startDate,
    nextRunDate: input.nextRunDate ?? current.nextRunDate,
    endDate: 'endDate' in input ? input.endDate : current.endDate,
    isActive: input.isActive ?? current.isActive,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

export function transactionInputFromRecurring(
  recurringTransaction: RecurringTransaction,
  scheduledDate: IsoDateString,
): CreateTransactionInput {
  const notes = recurringTransaction.notes
    ? `Recurring: ${recurringTransaction.name}\n${recurringTransaction.notes}`
    : `Recurring: ${recurringTransaction.name}`

  if (recurringTransaction.type === 'income') {
    return {
      type: 'income',
      amount: recurringTransaction.amount,
      categoryId: recurringTransaction.categoryId,
      toAccountId: recurringTransaction.toAccountId,
      date: scheduledDate,
      notes,
    }
  }

  if (recurringTransaction.type === 'expense') {
    return {
      type: 'expense',
      amount: recurringTransaction.amount,
      categoryId: recurringTransaction.categoryId,
      fromAccountId: recurringTransaction.fromAccountId,
      date: scheduledDate,
      notes,
    }
  }

  return {
    type: 'transfer',
    amount: recurringTransaction.amount,
    fromAccountId: recurringTransaction.fromAccountId,
    toAccountId: recurringTransaction.toAccountId,
    date: scheduledDate,
    notes,
  }
}
