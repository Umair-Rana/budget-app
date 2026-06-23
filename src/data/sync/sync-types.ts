import type { EntityId, IsoDateTimeString } from '@/data/models/common'

export type SyncStatus =
  | 'idle'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'

export type OperationType =
  | 'CreateAccount'
  | 'UpdateAccount'
  | 'DeleteAccount'
  | 'CreateTransaction'
  | 'UpdateTransaction'
  | 'DeleteTransaction'
  | 'CreateBill'
  | 'UpdateBill'
  | 'DeleteBill'
  | 'PayBill'
  | 'UnpayBill'
  | 'CreateGoal'
  | 'UpdateGoal'
  | 'DeleteGoal'
  | 'CreateGoalContribution'
  | 'WithdrawFromGoal'
  | 'CreateLoan'
  | 'UpdateLoan'
  | 'DeleteLoan'
  | 'RecordLoanRepayment'
  | 'CreateBudgetAllocation'
  | 'UpdateBudgetAllocation'
  | 'DeleteBudgetAllocation'
  | 'CreateRecurringTransaction'
  | 'UpdateRecurringTransaction'
  | 'DeleteRecurringTransaction'
  | 'GenerateRecurringTransactions'
  | 'CreateRecurringBill'
  | 'UpdateRecurringBill'
  | 'DeleteRecurringBill'
  | 'GenerateRecurringBills'

export type SyncEntity =
  | 'account'
  | 'transaction'
  | 'bill'
  | 'goal'
  | 'loan'
  | 'budget'
  | 'category'
  | 'recurringTransaction'
  | 'recurringBill'
  | 'household'

export interface PendingOperation<TPayload = unknown> {
  id: EntityId
  operationType: OperationType
  entity: SyncEntity
  householdId: EntityId
  userId: EntityId
  payload: TPayload
  idempotencyKey: string
  createdAt: IsoDateTimeString
}

export interface SyncConflict<TLocal = unknown, TRemote = unknown> {
  id: EntityId
  entity: SyncEntity
  operationId: EntityId
  localValue: TLocal
  remoteValue: TRemote
  detectedAt: IsoDateTimeString
  reason: string
}

export interface SyncResult {
  status: SyncStatus
  appliedOperationIds: EntityId[]
  failedOperationIds: EntityId[]
  conflicts: SyncConflict[]
  syncedAt?: IsoDateTimeString
}
