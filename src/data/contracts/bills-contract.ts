import type {
  Bill,
  CreateBillInput,
  MarkBillPaidInput,
  UpdateBillInput,
} from '@/data/models/bill'
import type { EntityId } from '@/data/models/common'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export interface BillsRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Bill[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Bill | undefined>
  create(input: CreateBillInput): Promise<Bill>
  update(id: EntityId, input: UpdateBillInput): Promise<Bill>
  archive(id: EntityId): Promise<Bill>
  deleteSoft(id: EntityId): Promise<Bill>
  markPaid(id: EntityId, input: MarkBillPaidInput): Promise<Bill>
  markUnpaid(id: EntityId): Promise<Bill>
}
