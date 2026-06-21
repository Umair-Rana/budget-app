import { Archive, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  categoryTypeOptions,
  getCategoryTypeLabel,
} from '@/data/display/category-options'
import type { Category, CategoryType } from '@/data/models/category'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type CategoryManagementSectionProps = {
  categories: Category[]
  error?: string
  isLoading: boolean
  isSeeding?: boolean
  onAdd: () => void
  onArchive: (category: Category) => void
  onDelete: (category: Category) => void
  onEdit: (category: Category) => void
  onSeedDefaults: () => void
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((first, second) => {
    if (Boolean(first.archivedAt) !== Boolean(second.archivedAt)) {
      return first.archivedAt ? 1 : -1
    }

    if (first.isDefault !== second.isDefault) {
      return first.isDefault ? -1 : 1
    }

    return first.name.localeCompare(second.name)
  })
}

function CategoryRow({
  category,
  onArchive,
  onDelete,
  onEdit,
}: {
  category: Category
  onArchive: (category: Category) => void
  onDelete: (category: Category) => void
  onEdit: (category: Category) => void
}) {
  const isArchived = Boolean(category.archivedAt)

  return (
    <div
      className={cn(
        'flex min-h-16 items-center gap-3 rounded-lg border bg-background px-3 py-2',
        isArchived && 'bg-muted/30',
      )}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ backgroundColor: category.color }}
      >
        {renderIconByName(category.icon, 'size-5')}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {category.name}
          </p>
          <span
            className="size-3 rounded-full border"
            style={{ backgroundColor: category.color }}
            aria-label={`${category.name} color`}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusBadge tone="outline">
            {getCategoryTypeLabel(category.type)}
          </StatusBadge>
          <StatusBadge tone={isArchived ? 'neutral' : 'success'}>
            {isArchived ? 'Archived' : 'Active'}
          </StatusBadge>
          {category.isDefault ? (
            <StatusBadge tone="info">Default</StatusBadge>
          ) : null}
        </div>
      </div>

      <ActionMenu
        label={`Open actions for ${category.name}`}
        items={[
          {
            icon: Pencil,
            label: 'Edit',
            onSelect: () => onEdit(category),
          },
          {
            disabled: isArchived,
            icon: Archive,
            label: 'Archive',
            onSelect: () => onArchive(category),
          },
          {
            icon: Trash2,
            label: 'Delete',
            onSelect: () => onDelete(category),
            separatorBefore: true,
            variant: 'destructive',
          },
        ]}
      />
    </div>
  )
}

function CategoryGroup({
  categories,
  type,
  title,
  onArchive,
  onDelete,
  onEdit,
}: {
  categories: Category[]
  type: CategoryType
  title: string
  onArchive: (category: Category) => void
  onDelete: (category: Category) => void
  onEdit: (category: Category) => void
}) {
  const groupCategories = sortCategories(
    categories.filter((category) => category.type === type),
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {groupCategories.length} {groupCategories.length === 1 ? 'category' : 'categories'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {groupCategories.length > 0 ? (
          groupCategories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onArchive={onArchive}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            No {title.toLowerCase()} categories yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CategoryManagementSection({
  categories,
  error,
  isLoading,
  isSeeding,
  onAdd,
  onArchive,
  onDelete,
  onEdit,
  onSeedDefaults,
}: CategoryManagementSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Categories</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Manage reusable income, expense, and adjustment categories for later
            transaction, bill, planner, report, and overview workflows.
          </p>
        </div>
        <Button type="button" onClick={onAdd}>
          <Plus className="size-4" aria-hidden="true" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading categories..." />
      ) : null}

      {error ? (
        <ErrorState message={error} />
      ) : null}

      {!isLoading && !error && categories.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No categories available"
          message="Seed the default category set or add a custom category to prepare for future transaction entry."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onSeedDefaults}
                disabled={isSeeding}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {isSeeding ? 'Checking...' : 'Seed Defaults'}
              </Button>
              <Button type="button" onClick={onAdd}>
                <Plus className="size-4" aria-hidden="true" />
                Add Category
              </Button>
            </div>
          }
        />
      ) : null}

      {!isLoading && !error && categories.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-3">
          {categoryTypeOptions.map((group) => (
            <CategoryGroup
              key={group.value}
              categories={categories}
              type={group.value}
              title={group.label}
              onArchive={onArchive}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
