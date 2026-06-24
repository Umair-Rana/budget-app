import { createRecordId } from '@/data/models/common'
import type { CreateTransactionInput } from '@/data/models/transaction'
import type {
  LocalSqliteDriver,
  LocalSqliteStatementParams,
} from '@/data/local-sqlite/local-sqlite-types'
import type {
  LocalOperationQueueEntityType,
  LocalOperationQueueStatus,
  LocalTransactionCreateOperationType,
} from '@/data/local-sqlite/sync/sync-result'

export type LocalOperationQueueRow = {
  attempt_count: number
  created_at: string
  entity_id: string | null
  entity_type: LocalOperationQueueEntityType
  household_id: string
  id: string
  idempotency_key: string
  last_error: string | null
  next_retry_at: string | null
  operation_type: LocalTransactionCreateOperationType
  payload_json: string
  status: LocalOperationQueueStatus
  updated_at: string
}

export type LocalTransactionCreateOperationPayload = {
  input: CreateTransactionInput
  localTransactionId: string
}

export function getTransactionCreateOperationType(
  input: Pick<CreateTransactionInput, 'type'>,
): LocalTransactionCreateOperationType {
  if (input.type === 'expense') {
    return 'CREATE_EXPENSE_TRANSACTION'
  }

  return 'CREATE_INCOME_TRANSACTION'
}

export function getLocalTransactionCreateIdempotencyKey(transactionId: string) {
  return `transaction:${transactionId}:create`
}

export async function enqueueLocalTransactionCreateOperation({
  driver,
  householdId,
  input,
  now,
  transactionId,
}: {
  driver: LocalSqliteDriver
  householdId: string
  input: CreateTransactionInput
  now: string
  transactionId: string
}) {
  const operationId = createRecordId()
  const payload: LocalTransactionCreateOperationPayload = {
    input,
    localTransactionId: transactionId,
  }

  await driver.run(
    [
      'insert into operation_queue',
      '(',
      [
        'id',
        'household_id',
        'operation_type',
        'entity_type',
        'entity_id',
        'payload_json',
        'status',
        'attempt_count',
        'idempotency_key',
        'last_error',
        'created_at',
        'updated_at',
        'next_retry_at',
      ].join(', '),
      ')',
      'values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'on conflict(idempotency_key) do update set',
      [
        'status = excluded.status',
        'payload_json = excluded.payload_json',
        'last_error = null',
        'updated_at = excluded.updated_at',
        'next_retry_at = null',
      ].join(', '),
    ].join(' '),
    [
      operationId,
      householdId,
      getTransactionCreateOperationType(input),
      'transaction',
      transactionId,
      JSON.stringify(payload),
      'pending',
      0,
      getLocalTransactionCreateIdempotencyKey(transactionId),
      null,
      now,
      now,
      null,
    ],
  )
}

export async function listReplayableLocalOperations({
  driver,
  householdId,
  limit = 25,
  now,
}: {
  driver: LocalSqliteDriver
  householdId: string
  limit?: number
  now: string
}) {
  return driver.query<LocalOperationQueueRow>(
    [
      'select * from operation_queue',
      'where household_id = ?',
      "and status in ('pending', 'failed')",
      'and (next_retry_at is null or next_retry_at <= ?)',
      'order by created_at',
      'limit ?',
    ].join(' '),
    [householdId, now, limit],
  )
}

async function updateOperation({
  driver,
  id,
  params,
  setSql,
}: {
  driver: LocalSqliteDriver
  id: string
  params: LocalSqliteStatementParams
  setSql: string
}) {
  await driver.run(`update operation_queue set ${setSql} where id = ?`, [
    ...params,
    id,
  ])
}

export async function markLocalOperationSyncing({
  driver,
  id,
  now,
}: {
  driver: LocalSqliteDriver
  id: string
  now: string
}) {
  await updateOperation({
    driver,
    id,
    params: ['syncing', null, now],
    setSql: 'status = ?, last_error = ?, updated_at = ?',
  })
}

export async function markLocalOperationSynced({
  driver,
  id,
  now,
}: {
  driver: LocalSqliteDriver
  id: string
  now: string
}) {
  await updateOperation({
    driver,
    id,
    params: ['synced', null, now, null],
    setSql: 'status = ?, last_error = ?, updated_at = ?, next_retry_at = ?',
  })
}

export async function markLocalOperationFailed({
  driver,
  errorMessage,
  id,
  nextRetryAt,
  now,
}: {
  driver: LocalSqliteDriver
  errorMessage: string
  id: string
  nextRetryAt: string | null
  now: string
}) {
  await updateOperation({
    driver,
    id,
    params: ['failed', errorMessage, now, nextRetryAt],
    setSql:
      'status = ?, attempt_count = attempt_count + 1, last_error = ?, updated_at = ?, next_retry_at = ?',
  })
}
