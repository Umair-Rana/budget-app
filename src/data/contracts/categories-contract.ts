import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

export type SeedDefaultCategoriesResult = {
  seeded: boolean
  createdCount: number
  updatedCount: number
}

export interface CategoriesRepositoryContract {
  getAll(options?: RepositoryListOptions): Promise<Category[]>
  getById(
    id: EntityId,
    options?: RepositoryListOptions,
  ): Promise<Category | undefined>
  getByType(
    type: CategoryType,
    options?: RepositoryListOptions,
  ): Promise<Category[]>
  create(input: CreateCategoryInput): Promise<Category>
  update(id: EntityId, input: UpdateCategoryInput): Promise<Category>
  archive(id: EntityId): Promise<Category>
  deleteSoft(id: EntityId): Promise<Category>
  seedDefaultsIfNeeded(): Promise<SeedDefaultCategoriesResult>
}
