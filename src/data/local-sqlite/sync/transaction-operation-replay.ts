import type { FinanceDataSource } from '@/data/contracts'
import type { CreateTransactionInput } from '@/data/models/transaction'
import type {
  LocalOperationQueueRow,
  LocalTransactionCreateOperationPayload,
} from '@/data/local-sqlite/sync/operation-queue-repository'

function parseTransactionCreatePayload(
  operation: LocalOperationQueueRow,
): LocalTransactionCreateOperationPayload {
  const payload = JSON.parse(operation.payload_json) as Partial<{
    input: CreateTransactionInput
    localTransactionId: string
  }>

  if (
    !payload.input ||
    (payload.input.type !== 'expense' && payload.input.type !== 'income')
  ) {
    throw new Error('Queued transaction operation payload is invalid.')
  }

  return {
    input: payload.input,
    localTransactionId: payload.localTransactionId ?? operation.entity_id ?? '',
  }
}

export async function replayLocalTransactionCreateOperation({
  operation,
  supabaseDataSource,
}: {
  operation: LocalOperationQueueRow
  supabaseDataSource: FinanceDataSource
}) {
  if (
    operation.operation_type !== 'CREATE_EXPENSE_TRANSACTION' &&
    operation.operation_type !== 'CREATE_INCOME_TRANSACTION'
  ) {
    throw new Error(`Unsupported operation type: ${operation.operation_type}`)
  }

  const payload = parseTransactionCreatePayload(operation)

  return supabaseDataSource.transactions.create({
    ...payload.input,
    idempotencyKey: operation.idempotency_key,
  })
}
