import type {
  BudgetAllocation,
  CreateBudgetAllocationInput,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import type { EntityId } from '@/data/models/common'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface BudgetsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<BudgetAllocation[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<BudgetAllocation | undefined>
  getByMonth(
    month: string,
    options?: RepositoryListOptions,
  ): Promise<BudgetAllocation[]>
  create(input: CreateBudgetAllocationInput): Promise<BudgetAllocation>
  update(
    id: EntityId,
    input: UpdateBudgetAllocationInput,
  ): Promise<BudgetAllocation>
  archive(id: EntityId): Promise<BudgetAllocation>
  deleteSoft(id: EntityId): Promise<BudgetAllocation>
}
