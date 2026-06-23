import type {
  EntityId,
  FinanceMetadataRecord,
  FinanceRecord,
  IsoDateTimeString,
} from '@/data/models/common'
import type {
  OperationQueueItem,
  OperationQueueRepository,
} from '@/data/sync/operation-queue'
import type { SyncStatus } from '@/data/sync/sync-types'

export interface LocalRepositoryListOptions {
  includeArchived?: boolean
  includeDeleted?: boolean
  updatedSince?: IsoDateTimeString
}

export interface LocalRepositoryMutationMetadata {
  householdId: EntityId
  userId: EntityId
  syncStatus?: SyncStatus
  operationId?: EntityId
}

export interface LocalEntityRepository<
  TRecord extends FinanceRecord,
  TCreateInput,
  TUpdateInput,
> {
  list(options?: LocalRepositoryListOptions): Promise<TRecord[]>
  getById(id: EntityId): Promise<TRecord | null>
  create(
    input: TCreateInput,
    metadata: LocalRepositoryMutationMetadata,
  ): Promise<TRecord>
  update(
    id: EntityId,
    input: TUpdateInput,
    metadata: LocalRepositoryMutationMetadata,
  ): Promise<TRecord>
  delete(id: EntityId, metadata: LocalRepositoryMutationMetadata): Promise<void>
}

export interface LocalSyncMetadataRepository {
  get(key: string): Promise<FinanceMetadataRecord | null>
  set(record: FinanceMetadataRecord): Promise<FinanceMetadataRecord>
  delete(key: string): Promise<void>
}

export interface LocalFinanceRepository {
  operationQueue: OperationQueueRepository
  syncMetadata: LocalSyncMetadataRepository
  listQueuedOperations(householdId: EntityId): Promise<OperationQueueItem[]>
}
