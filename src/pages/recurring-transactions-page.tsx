import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Plus, RefreshCw, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { RecurringTransactionCard } from '@/components/recurring/recurring-transaction-card'
import { RecurringTransactionFormDialog } from '@/components/recurring/recurring-transaction-form-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Account } from '@/data/models/account'
import type { Category } from '@/data/models/category'
import type {
  CreateRecurringTransactionInput,
  RecurringTransaction,
  UpdateRecurringTransactionInput,
} from '@/data/models/recurring-transaction'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const recurringTransactionsQueryKey = ['recurring-transactions']
const dueRecurringTransactionsQueryKey = ['recurring-transactions', 'due']
const accountsQueryKey = ['accounts', 'recurring-page']
const categoriesQueryKey = ['categories', 'recurring-page']

type ConfirmAction =
  | {
      type: 'archive'
      recurringTransaction: RecurringTransaction
    }
  | {
      type: 'delete'
      recurringTransaction: RecurringTransaction
    }

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

function isActiveAccount(account: Account) {
  return !account.archivedAt && !account.deletedAt
}

function isActiveCategory(category: Category) {
  return !category.archivedAt && !category.deletedAt
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function sortRecurringTransactions(
  recurringTransactions: RecurringTransaction[],
) {
  return [...recurringTransactions].sort((first, second) => {
    if (Boolean(first.archivedAt) !== Boolean(second.archivedAt)) {
      return first.archivedAt ? 1 : -1
    }

    if (first.nextRunDate !== second.nextRunDate) {
      return first.nextRunDate.localeCompare(second.nextRunDate)
    }

    return first.name.localeCompare(second.name)
  })
}

export function RecurringTransactionsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecurringTransaction, setEditingRecurringTransaction] =
    useState<RecurringTransaction | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const recurringTransactionsQuery = useQuery({
    queryKey: [...recurringTransactionsQueryKey, dataSourceKey],
    queryFn: () =>
      dataSource.recurringTransactions.getAll({ includeArchived: true }),
  })
  const dueRecurringTransactionsQuery = useQuery({
    queryKey: [...dueRecurringTransactionsQueryKey, dataSourceKey],
    queryFn: () => dataSource.recurringTransactions.getDue(),
  })
  const accountsQuery = useQuery({
    queryKey: [...accountsQueryKey, dataSourceKey],
    queryFn: () => dataSource.accounts.getAll({ includeArchived: true }),
  })
  const categoriesQuery = useQuery({
    queryKey: [...categoriesQueryKey, dataSourceKey],
    queryFn: async () => {
      await dataSource.categories.seedDefaultsIfNeeded()

      return dataSource.categories.getAll({ includeArchived: true })
    },
  })

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const activeAccounts = useMemo(
    () => accounts.filter(isActiveAccount),
    [accounts],
  )
  const activeCategories = useMemo(
    () => categories.filter(isActiveCategory),
    [categories],
  )
  const accountsById = useMemo(() => createRecordMap(accounts), [accounts])
  const categoriesById = useMemo(() => createRecordMap(categories), [categories])
  const recurringTransactions = useMemo(
    () => sortRecurringTransactions(recurringTransactionsQuery.data ?? []),
    [recurringTransactionsQuery.data],
  )
  const dueCount = dueRecurringTransactionsQuery.data?.length ?? 0
  const loading =
    recurringTransactionsQuery.isLoading ||
    dueRecurringTransactionsQuery.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading
  const loadError =
    recurringTransactionsQuery.error ??
    dueRecurringTransactionsQuery.error ??
    accountsQuery.error ??
    categoriesQuery.error
  const noAccounts = !loading && !loadError && activeAccounts.length === 0

  const createMutation = useMutation({
    mutationFn: (input: CreateRecurringTransactionInput) =>
      dataSource.recurringTransactions.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recurringTransactionsQueryKey,
      })
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
      showToast({
        title: 'Recurring transaction created',
        description: 'The schedule was saved to your cloud household.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring transaction',
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
      input: UpdateRecurringTransactionInput
    }) => dataSource.recurringTransactions.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recurringTransactionsQueryKey,
      })
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
      showToast({
        title: 'Recurring transaction updated',
        description: 'The schedule changes were saved.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring transaction',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const archiveMutation = useMutation({
    mutationFn: (id: string) => dataSource.recurringTransactions.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recurringTransactionsQueryKey,
      })
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
      showToast({
        title: 'Recurring transaction archived',
        description: 'Archived schedules will no longer generate transactions.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring transaction',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataSource.recurringTransactions.deleteSoft(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recurringTransactionsQueryKey,
      })
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
      showToast({
        title: 'Recurring transaction deleted',
        description: 'The schedule was soft deleted.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving recurring transaction',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const generateDueMutation = useMutation({
    mutationFn: () => dataSource.recurringTransactions.generateDue(),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['planner'] }),
        queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
      ])
      showToast({
        title: 'Recurring generation finished',
        description: `${result.generatedCount} generated, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
        variant: result.failedCount > 0 ? 'error' : 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error generating transactions',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting = archiveMutation.isPending || deleteMutation.isPending

  function openAddRecurringTransaction() {
    setEditingRecurringTransaction(undefined)
    setFormOpen(true)
  }

  function openEditRecurringTransaction(
    recurringTransaction: RecurringTransaction,
  ) {
    setEditingRecurringTransaction(recurringTransaction)
    setFormOpen(true)
  }

  async function createRecurringTransaction(
    input: CreateRecurringTransactionInput,
  ) {
    try {
      await createMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateRecurringTransaction(
    id: string,
    input: UpdateRecurringTransactionInput,
  ) {
    try {
      await updateMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmRecurringTransactionAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveMutation.mutateAsync(
          confirmAction.recurringTransaction.id,
        )
      } else {
        await deleteMutation.mutateAsync(confirmAction.recurringTransaction.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Transactions"
      title="Recurring"
      description="Create schedules for income, expenses, and transfers, then generate due transactions manually."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading || dueCount === 0 || generateDueMutation.isPending}
            onClick={() => generateDueMutation.mutate()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {generateDueMutation.isPending
              ? 'Generating...'
              : `Generate Due (${dueCount})`}
          </Button>
          <Button
            type="button"
            disabled={noAccounts || loading}
            onClick={openAddRecurringTransaction}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Recurring
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? <LoadingState message="Loading recurring transactions..." /> : null}

        {loadError ? <ErrorState message={getErrorMessage(loadError)} /> : null}

        {noAccounts ? (
          <EmptyState
            icon={WalletCards}
            title="Create an account first."
            message="Recurring income, expenses, and transfers need at least one active account."
            action={
              <Button asChild>
                <Link to="/accounts">Open Accounts</Link>
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && !noAccounts ? (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    {dueCount} due schedule{dueCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 leading-6">
                    Manual generation creates normal transactions and advances
                    each schedule after a successful transaction save.
                  </p>
                </div>
              </CardContent>
            </Card>

            {recurringTransactions.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No recurring transactions yet."
                message="Add salary, rent, subscriptions, or recurring transfers and generate them when they are due."
                action={
                  <Button type="button" onClick={openAddRecurringTransaction}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add Recurring
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recurringTransactions.map((recurringTransaction) => (
                  <RecurringTransactionCard
                    key={recurringTransaction.id}
                    recurringTransaction={recurringTransaction}
                    accountsById={accountsById}
                    categoriesById={categoriesById}
                    onEdit={openEditRecurringTransaction}
                    onArchive={(nextRecurringTransaction) =>
                      setConfirmAction({
                        type: 'archive',
                        recurringTransaction: nextRecurringTransaction,
                      })
                    }
                    onDelete={(nextRecurringTransaction) =>
                      setConfirmAction({
                        type: 'delete',
                        recurringTransaction: nextRecurringTransaction,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      <RecurringTransactionFormDialog
        open={formOpen}
        recurringTransaction={editingRecurringTransaction}
        accounts={activeAccounts}
        categories={activeCategories}
        onClose={() => setFormOpen(false)}
        onCreate={createRecurringTransaction}
        onUpdate={updateRecurringTransaction}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive recurring transaction?'
            : 'Delete recurring transaction?'
        }
        description={
          confirmAction?.type === 'archive'
            ? 'Archived recurring transactions stop generating future transactions.'
            : 'Deleted recurring transactions are soft deleted and stop generating future transactions.'
        }
        confirmLabel={
          confirmAction?.type === 'archive'
            ? 'Archive Recurring'
            : 'Delete Recurring'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmRecurringTransactionAction}
      />
    </PageShell>
  )
}
