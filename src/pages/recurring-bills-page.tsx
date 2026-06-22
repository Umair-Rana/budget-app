import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Plus, Receipt, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { RecurringBillCard } from '@/components/recurring-bills/recurring-bill-card'
import { RecurringBillFormDialog } from '@/components/recurring-bills/recurring-bill-form-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Category } from '@/data/models/category'
import type {
  CreateRecurringBillInput,
  RecurringBill,
  UpdateRecurringBillInput,
} from '@/data/models/recurring-bill'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const recurringBillsQueryKey = ['recurring-bills']
const dueRecurringBillsQueryKey = ['recurring-bills', 'due']
const categoriesQueryKey = ['categories', 'recurring-bills-page']

type ConfirmAction =
  | {
      type: 'archive'
      recurringBill: RecurringBill
    }
  | {
      type: 'delete'
      recurringBill: RecurringBill
    }

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function isActiveExpenseCategory(category: Category) {
  return (
    category.type === 'expense' && !category.archivedAt && !category.deletedAt
  )
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function sortRecurringBills(recurringBills: RecurringBill[]) {
  return [...recurringBills].sort((first, second) => {
    if (Boolean(first.archivedAt) !== Boolean(second.archivedAt)) {
      return first.archivedAt ? 1 : -1
    }

    if (first.nextDueDate !== second.nextDueDate) {
      return first.nextDueDate.localeCompare(second.nextDueDate)
    }

    return first.name.localeCompare(second.name)
  })
}

export function RecurringBillsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecurringBill, setEditingRecurringBill] =
    useState<RecurringBill | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const recurringBillsQuery = useQuery({
    queryKey: [...recurringBillsQueryKey, dataSourceKey],
    queryFn: () => dataSource.recurringBills.getAll({ includeArchived: true }),
  })
  const dueRecurringBillsQuery = useQuery({
    queryKey: [...dueRecurringBillsQueryKey, dataSourceKey],
    queryFn: () => dataSource.recurringBills.getDue(),
  })
  const categoriesQuery = useQuery({
    queryKey: [...categoriesQueryKey, dataSourceKey],
    queryFn: async () => {
      await dataSource.categories.seedDefaultsIfNeeded()

      return dataSource.categories.getAll({ includeArchived: true })
    },
  })

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const expenseCategories = useMemo(
    () => categories.filter(isActiveExpenseCategory),
    [categories],
  )
  const categoriesById = useMemo(() => createRecordMap(categories), [categories])
  const recurringBills = useMemo(
    () => sortRecurringBills(recurringBillsQuery.data ?? []),
    [recurringBillsQuery.data],
  )
  const dueCount = dueRecurringBillsQuery.data?.length ?? 0
  const loading =
    recurringBillsQuery.isLoading ||
    dueRecurringBillsQuery.isLoading ||
    categoriesQuery.isLoading
  const loadError =
    recurringBillsQuery.error ??
    dueRecurringBillsQuery.error ??
    categoriesQuery.error

  const invalidateRecurringBillData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: recurringBillsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['bills'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateRecurringBillInput) =>
      dataSource.recurringBills.create(input),
    onSuccess: async () => {
      await invalidateRecurringBillData()
      showToast({
        title: 'Recurring bill created',
        description: 'The bill schedule was saved to your cloud household.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring bill',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateRecurringBillInput
    }) => dataSource.recurringBills.update(id, input),
    onSuccess: async () => {
      await invalidateRecurringBillData()
      showToast({
        title: 'Recurring bill updated',
        description: 'The bill schedule changes were saved.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring bill',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const archiveMutation = useMutation({
    mutationFn: (id: string) => dataSource.recurringBills.archive(id),
    onSuccess: async () => {
      await invalidateRecurringBillData()
      showToast({
        title: 'Recurring bill archived',
        description: 'Archived schedules will no longer generate bills.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring bill',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSource.recurringBills.deleteSoft(id),
    onSuccess: async () => {
      await invalidateRecurringBillData()
      showToast({
        title: 'Recurring bill deleted',
        description: 'The schedule was soft deleted.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring bill',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const generateDueMutation = useMutation({
    mutationFn: () => dataSource.recurringBills.generateDue(),
    onSuccess: async (result) => {
      await invalidateRecurringBillData()
      showToast({
        title: 'Recurring bill generation finished',
        description: `${result.generatedCount} generated, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
        variant: result.failedCount > 0 ? 'error' : 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error generating bills',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting = archiveMutation.isPending || deleteMutation.isPending
  const noCategories = !loading && !loadError && expenseCategories.length === 0

  function openAddRecurringBill() {
    setEditingRecurringBill(undefined)
    setFormOpen(true)
  }

  function openEditRecurringBill(recurringBill: RecurringBill) {
    setEditingRecurringBill(recurringBill)
    setFormOpen(true)
  }

  async function createRecurringBill(input: CreateRecurringBillInput) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateRecurringBill(
    id: string,
    input: UpdateRecurringBillInput,
  ) {
    try {
      await updateMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmRecurringBillAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveMutation.mutateAsync(confirmAction.recurringBill.id)
      } else {
        await deleteMutation.mutateAsync(confirmAction.recurringBill.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Bills"
      title="Recurring Bills"
      description="Create bill schedules and generate unpaid bill records when they are due."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/bills">
              <Receipt className="size-4" aria-hidden="true" />
              Bills
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading || dueCount === 0 || generateDueMutation.isPending}
            onClick={() => generateDueMutation.mutate()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {generateDueMutation.isPending
              ? 'Generating...'
              : `Generate Due Bills (${dueCount})`}
          </Button>
          <Button
            type="button"
            disabled={noCategories || loading}
            onClick={openAddRecurringBill}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Recurring Bill
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? <LoadingState message="Loading recurring bills..." /> : null}

        {loadError ? <ErrorState message={getErrorMessage(loadError)} /> : null}

        {noCategories ? (
          <EmptyState
            icon={Receipt}
            title="Create an expense category first."
            message="Recurring bill schedules need an active expense category."
            action={
              <Button asChild>
                <Link to="/settings">Open Settings</Link>
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && !noCategories ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {dueCount} due bill schedule{dueCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 leading-6">
                    Manual generation creates unpaid bills. Use Mark Paid on the
                    Bills page when payment happens.
                  </p>
                </div>
              </CardContent>
            </Card>

            {recurringBills.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No recurring bills yet."
                message="Add rent, utilities, subscriptions, or other repeating bills and generate them when due."
                action={
                  <Button type="button" onClick={openAddRecurringBill}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add Recurring Bill
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recurringBills.map((recurringBill) => (
                  <RecurringBillCard
                    key={recurringBill.id}
                    recurringBill={recurringBill}
                    categoriesById={categoriesById}
                    onEdit={openEditRecurringBill}
                    onArchive={(nextRecurringBill) =>
                      setConfirmAction({
                        type: 'archive',
                        recurringBill: nextRecurringBill,
                      })
                    }
                    onDelete={(nextRecurringBill) =>
                      setConfirmAction({
                        type: 'delete',
                        recurringBill: nextRecurringBill,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      <RecurringBillFormDialog
        open={formOpen}
        recurringBill={editingRecurringBill}
        expenseCategories={expenseCategories}
        onClose={() => setFormOpen(false)}
        onCreate={createRecurringBill}
        onUpdate={updateRecurringBill}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive recurring bill?'
            : 'Delete recurring bill?'
        }
        description={
          confirmAction?.type === 'archive'
            ? 'Archived recurring bills stop generating future bills.'
            : 'Deleted recurring bills are soft deleted and stop generating future bills.'
        }
        confirmLabel={
          confirmAction?.type === 'archive'
            ? 'Archive Recurring Bill'
            : 'Delete Recurring Bill'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmRecurringBillAction}
      />
    </PageShell>
  )
}
