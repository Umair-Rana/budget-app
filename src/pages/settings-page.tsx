import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { PageShell } from '@/components/app/page-shell'
import { BackupRestoreSection } from '@/components/backup/backup-restore-section'
import { CategoryFormDialog } from '@/components/categories/category-form-dialog'
import { CategoryManagementSection } from '@/components/categories/category-management-section'
import { CloudAccountSection } from '@/components/settings/cloud-account-section'
import { DeleteHouseholdSection } from '@/components/settings/delete-household-section'
import { HouseholdNameSection } from '@/components/settings/household-name-section'
import { HouseholdMembersSection } from '@/components/settings/household-members-section'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  createCloudBackup,
  downloadCloudBackupFile,
} from '@/data/backup/cloud-backup-export'
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/data/models/category'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { getSupabaseClient } from '@/lib/supabase/supabase-client'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/theme-context'
import { useToast } from '@/providers/toast-context'

const categoriesQueryKey = ['categories', 'settings']

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    icon: Laptop,
  },
] as const

type ConfirmAction =
  | {
      type: 'archive'
      category: Category
    }
  | {
      type: 'delete'
      category: Category
    }

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function categorySortValue(category: Category) {
  return `${category.type}:${category.archivedAt ? '1' : '0'}:${category.name}`
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { setTheme, theme } = useTheme()
  const { showToast } = useToast()
  const { cloudHousehold, dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const categoriesQuery = useQuery({
    queryKey: [...categoriesQueryKey, dataSourceKey],
    queryFn: async () => {
      await dataSource.categories.seedDefaultsIfNeeded()

      return dataSource.categories.getAll({ includeArchived: true })
    },
  })
  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort((first, second) =>
        categorySortValue(first).localeCompare(categorySortValue(second)),
      ),
    [categoriesQuery.data],
  )

  const createCategoryMutation = useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      dataSource.categories.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      showToast({
        title: 'Category created',
        description: 'The category was saved to your cloud household.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving category',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const updateCategoryMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateCategoryInput
    }) => dataSource.categories.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      showToast({
        title: 'Category updated',
        description: 'The category changes were saved to your cloud household.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving category',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const archiveCategoryMutation = useMutation({
    mutationFn: (id: string) => dataSource.categories.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      showToast({
        title: 'Category archived',
        description: 'Archived categories are hidden from active category queries.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving category',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => dataSource.categories.deleteSoft(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      showToast({
        title: 'Category deleted',
        description: 'The category was soft deleted from active views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving category',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const seedDefaultsMutation = useMutation({
    mutationFn: () => dataSource.categories.seedDefaultsIfNeeded(),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: categoriesQueryKey })
      showToast({
        title: result.createdCount > 0 ? 'Default categories added' : 'Defaults checked',
        description:
          result.createdCount > 0
            ? `${result.createdCount} default categories were added.`
            : 'No duplicate defaults were created.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving category',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const exportCloudBackupMutation = useMutation({
    mutationFn: () =>
      createCloudBackup({
        client: getSupabaseClient(),
        householdId: cloudHousehold?.id,
      }),
    onSuccess: (backup) => {
      downloadCloudBackupFile(backup)
      showToast({
        title: 'Cloud backup exported',
        description: 'Your household backup JSON was downloaded.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Export failed',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting =
    archiveCategoryMutation.isPending || deleteCategoryMutation.isPending

  function openAddCategory() {
    setEditingCategory(undefined)
    setFormOpen(true)
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  async function createCategory(input: CreateCategoryInput) {
    try {
      await createCategoryMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateCategory(id: string, input: UpdateCategoryInput) {
    try {
      await updateCategoryMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmCategoryAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveCategoryMutation.mutateAsync(confirmAction.category.id)
      } else {
        await deleteCategoryMutation.mutateAsync(confirmAction.category.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  function confirmationDescription(action: ConfirmAction | null) {
    if (!action) {
      return ''
    }

    if (action.type === 'archive') {
      return action.category.isDefault
        ? 'This is a default category used by future finance workflows. Archiving is safer than deleting and keeps the record available for history.'
        : 'Archived categories are removed from active category pickers later, but the local record remains available.'
    }

    return action.category.isDefault
      ? 'This is a default category. This action is a soft delete, not a hard delete, but archiving is preferred unless you are sure.'
      : 'Deleted categories are soft deleted and hidden from active views. This does not remove transactions because transaction CRUD is not implemented yet.'
  }

  return (
    <PageShell
      title="Settings"
      description="Non-financial preferences can be adjusted here without storing household finance records."
      breadcrumb={[{ label: 'More', href: '/more' }]}
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Theme preference is saved on this device only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const active = theme === option.value

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    className={cn('h-12 justify-start', active && 'shadow-sm')}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <CloudAccountSection />

        <HouseholdNameSection />

        <HouseholdMembersSection />

        <DeleteHouseholdSection />

        <BackupRestoreSection
          householdName={cloudHousehold?.name}
          isExporting={exportCloudBackupMutation.isPending}
          onExport={() => exportCloudBackupMutation.mutate()}
        />

        <CategoryManagementSection
          categories={categories}
          error={
            categoriesQuery.error
              ? getErrorMessage(categoriesQuery.error)
              : undefined
          }
          isLoading={categoriesQuery.isLoading}
          isSeeding={seedDefaultsMutation.isPending}
          onAdd={openAddCategory}
          onArchive={(category) =>
            setConfirmAction({ type: 'archive', category })
          }
          onDelete={(category) =>
            setConfirmAction({ type: 'delete', category })
          }
          onEdit={openEditCategory}
          onSeedDefaults={() => seedDefaultsMutation.mutate()}
        />
      </div>

      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onCreate={createCategory}
        onUpdate={updateCategory}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive category?'
            : 'Delete category?'
        }
        description={confirmationDescription(confirmAction)}
        confirmLabel={
          confirmAction?.type === 'archive'
            ? 'Archive Category'
            : 'Delete Category'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmCategoryAction}
      />

    </PageShell>
  )
}
