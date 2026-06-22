import type { EntityId, IsoDateString } from '@/data/models/common'
import type {
  CreateRecurringBillInput,
  GenerateRecurringBillsResult,
  RecurringBill,
  UpdateRecurringBillInput,
} from '@/data/models/recurring-bill'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface RecurringBillsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<RecurringBill[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<RecurringBill | undefined>
  getDue(asOfDate?: IsoDateString): Promise<RecurringBill[]>
  create(input: CreateRecurringBillInput): Promise<RecurringBill>
  update(id: EntityId, input: UpdateRecurringBillInput): Promise<RecurringBill>
  archive(id: EntityId): Promise<RecurringBill>
  deleteSoft(id: EntityId): Promise<RecurringBill>
  generateDue(asOfDate?: IsoDateString): Promise<GenerateRecurringBillsResult>
}
