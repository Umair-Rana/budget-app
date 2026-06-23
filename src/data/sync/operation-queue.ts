import type { EntityId, IsoDateTimeString } from '@/data/models/common'
import type { OperationType, PendingOperation, SyncEntity } from '@/data/sync/sync-types'

export type OperationQueueItemStatus =
  | 'queued'
  | 'processing'
  | 'applied'
  | 'failed'
  | 'conflict'

export interface OperationQueueItem<TPayload = unknown>
  extends PendingOperation<TPayload> {
  status: OperationQueueItemStatus
  retries: number
  lastAttemptAt?: IsoDateTimeString
  nextAttemptAt?: IsoDateTimeString
  errorMessage?: string
}

export interface CreateOperationQueueItemInput<TPayload = unknown> {
  operationType: OperationType
  entity: SyncEntity
  householdId: EntityId
  userId: EntityId
  payload: TPayload
  idempotencyKey: string
}

export interface OperationQueueRepository {
  enqueue<TPayload>(
    input: CreateOperationQueueItemInput<TPayload>,
  ): Promise<OperationQueueItem<TPayload>>
  listPending(householdId: EntityId): Promise<OperationQueueItem[]>
  markProcessing(id: EntityId): Promise<OperationQueueItem>
  markApplied(id: EntityId): Promise<OperationQueueItem>
  markFailed(id: EntityId, errorMessage: string): Promise<OperationQueueItem>
  markConflict(id: EntityId, errorMessage: string): Promise<OperationQueueItem>
}
