import {
  createTransactionDateTime,
  normalizeTransactionTime,
} from '@/data/domain/transaction-datetime'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  CreateTransactionInput,
  Transaction,
} from '@/data/models/transaction'
import { toLocalTransactionRow } from '@/data/local-sqlite/mappers'
import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import { upsertLocalSqliteRow } from '@/data/local-sqlite/hydration'
import { enqueueLocalTransactionCreateOperation } from '@/data/local-sqlite/sync/operation-queue-repository'

export const unsupportedOfflineTransactionTypeMessage =
  'Online connection is required for this transaction type.'

export const offlineTransactionAccountRequiredMessage =
  'An account is required to save this transaction offline.'

type LocalAccountBalanceRow = {
  current_balance: number
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function sanitizeOfflineTransactionInput(
  input: CreateTransactionInput,
): CreateTransactionInput {
  if (input.type !== 'expense' && input.type !== 'income') {
    throw new Error(unsupportedOfflineTransactionTypeMessage)
  }

  const normalizedTime = normalizeTransactionTime(input.time)
  const base = {
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    notes: normalizeNotes(input.notes),
    time: normalizedTime,
    transactionDateTime:
      createTransactionDateTime(input.date, normalizedTime) ??
      input.transactionDateTime,
    type: input.type,
  }

  if (input.type === 'expense') {
    return {
      ...base,
      fromAccountId: input.fromAccountId,
    }
  }

  return {
    ...base,
    toAccountId: input.toAccountId,
  }
}

function createOfflineTransactionRecord(
  input: CreateTransactionInput,
): Transaction {
  const now = createTimestamp()
  const sanitizedInput = sanitizeOfflineTransactionInput(input)

  return {
    amount: sanitizedInput.amount,
    categoryId: sanitizedInput.categoryId,
    createdAt: now,
    date: sanitizedInput.date,
    fromAccountId: sanitizedInput.fromAccountId,
    id: createRecordId(),
    notes: sanitizedInput.notes,
    time: sanitizedInput.time,
    toAccountId: sanitizedInput.toAccountId,
    transactionDateTime: sanitizedInput.transactionDateTime,
    type: sanitizedInput.type,
    updatedAt: now,
  }
}

function getOfflineTransactionAccountId(transaction: Transaction) {
  return transaction.type === 'expense'
    ? transaction.fromAccountId
    : transaction.toAccountId
}

function getAccountBalanceDelta(transaction: Transaction) {
  return transaction.type === 'expense'
    ? -transaction.amount
    : transaction.amount
}

async function requireLocalAccountBalance({
  accountId,
  driver,
  householdId,
}: {
  accountId: string
  driver: LocalSqliteDriver
  householdId: string
}) {
  const rows = await driver.query<LocalAccountBalanceRow>(
    [
      'select current_balance',
      'from accounts',
      'where household_id = ? and id = ? and deleted_at is null',
      'limit 1',
    ].join(' '),
    [householdId, accountId],
  )
  const balance = rows[0]?.current_balance

  if (typeof balance !== 'number') {
    throw new Error('Selected account is not available offline.')
  }

  return balance
}

async function updateLocalAccountBalance({
  accountId,
  balance,
  driver,
  householdId,
  now,
}: {
  accountId: string
  balance: number
  driver: LocalSqliteDriver
  householdId: string
  now: string
}) {
  await driver.run(
    [
      'update accounts',
      'set current_balance = ?, updated_at = ?',
      'where household_id = ? and id = ? and deleted_at is null',
    ].join(' '),
    [balance, now, householdId, accountId],
  )
}

export async function createOfflineLocalTransaction({
  driver,
  householdId,
  input,
  userId,
}: {
  driver: LocalSqliteDriver
  householdId: string
  input: CreateTransactionInput
  userId?: string | null
}) {
  const transaction = createOfflineTransactionRecord(input)
  const accountId = getOfflineTransactionAccountId(transaction)

  if (!accountId) {
    throw new Error(offlineTransactionAccountRequiredMessage)
  }

  await driver.transaction(async () => {
    const currentBalance = await requireLocalAccountBalance({
      accountId,
      driver,
      householdId,
    })
    const nextBalance = currentBalance + getAccountBalanceDelta(transaction)

    await upsertLocalSqliteRow({
      driver,
      row: toLocalTransactionRow(transaction, {
        householdId,
        userId: userId ?? undefined,
      }) as unknown as Record<string, number | string | null>,
      tableName: 'transactions',
    })
    await updateLocalAccountBalance({
      accountId,
      balance: nextBalance,
      driver,
      householdId,
      now: transaction.updatedAt,
    })
    await enqueueLocalTransactionCreateOperation({
      driver,
      householdId,
      input: sanitizeOfflineTransactionInput(input),
      now: transaction.createdAt,
      transactionId: transaction.id,
    })
  })

  return transaction
}

export type LocalOfflineTransactionWriteStatement = {
  params?: LocalSqliteStatementParams
  sql: string
}
