import type { Transaction } from '@/data/models/transaction'

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidDate(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function isValidTime(value: string | undefined) {
  return Boolean(value && timePattern.test(value))
}

function padTimePart(value: number) {
  return String(value).padStart(2, '0')
}

function parseTimestamp(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

function timeFromTimestamp(value: string | undefined) {
  const timestamp = parseTimestamp(value)

  if (timestamp === undefined) {
    return undefined
  }

  const date = new Date(timestamp)

  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`
}

function timestampFromLocalDateTime(date: string, time: string) {
  return parseTimestamp(`${date}T${time}:00`)
}

export function getCurrentLocalTimeInputValue() {
  const now = new Date()

  return `${padTimePart(now.getHours())}:${padTimePart(now.getMinutes())}`
}

export function normalizeTransactionTime(time: string | undefined) {
  const normalized = time?.trim()

  return isValidTime(normalized) ? normalized : undefined
}

export function createTransactionDateTime(
  date: string,
  time: string | undefined,
) {
  const normalizedTime = normalizeTransactionTime(time)

  if (!isValidDate(date) || !normalizedTime) {
    return undefined
  }

  const timestamp = timestampFromLocalDateTime(date, normalizedTime)

  return timestamp === undefined ? undefined : new Date(timestamp).toISOString()
}

export function getTransactionFormTime(transaction?: Transaction) {
  if (!transaction) {
    return getCurrentLocalTimeInputValue()
  }

  const explicitTime = normalizeTransactionTime(transaction.time)

  return (
    explicitTime ??
    timeFromTimestamp(transaction.transactionDateTime) ??
    timeFromTimestamp(transaction.createdAt) ??
    '00:00'
  )
}

export function getTransactionDisplayTime(transaction: Transaction) {
  return (
    normalizeTransactionTime(transaction.time) ??
    timeFromTimestamp(transaction.transactionDateTime)
  )
}

export function getTransactionSortTimestamp(transaction: Transaction) {
  const explicitTime = normalizeTransactionTime(transaction.time)

  if (isValidDate(transaction.date) && explicitTime) {
    const timestamp = timestampFromLocalDateTime(transaction.date, explicitTime)

    if (timestamp !== undefined) {
      return timestamp
    }
  }

  const transactionDateTime = parseTimestamp(transaction.transactionDateTime)

  if (transactionDateTime !== undefined) {
    return transactionDateTime
  }

  const createdAtFallbackTime = timeFromTimestamp(transaction.createdAt)

  if (isValidDate(transaction.date) && createdAtFallbackTime) {
    const timestamp = timestampFromLocalDateTime(
      transaction.date,
      createdAtFallbackTime,
    )

    if (timestamp !== undefined) {
      return timestamp
    }
  }

  const createdAtTimestamp = parseTimestamp(transaction.createdAt)

  if (createdAtTimestamp !== undefined) {
    return createdAtTimestamp
  }

  if (isValidDate(transaction.date)) {
    return timestampFromLocalDateTime(transaction.date, '00:00') ?? 0
  }

  return 0
}
