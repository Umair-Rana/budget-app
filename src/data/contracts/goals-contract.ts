import type { EntityId } from '@/data/models/common'
import type {
  AddGoalContributionInput,
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
  WithdrawFromGoalInput,
} from '@/data/models/goal'
import type { Transaction } from '@/data/models/transaction'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export type GoalMovementResult = {
  goal: Goal
  transaction: Transaction
}

export interface GoalsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Goal[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Goal | undefined>
  create(input: CreateGoalInput): Promise<Goal>
  update(id: EntityId, input: UpdateGoalInput): Promise<Goal>
  archive(id: EntityId): Promise<Goal>
  deleteSoft(id: EntityId): Promise<Goal>
  addContribution(
    id: EntityId,
    input: AddGoalContributionInput,
  ): Promise<GoalMovementResult>
  withdraw(id: EntityId, input: WithdrawFromGoalInput): Promise<GoalMovementResult>
}
