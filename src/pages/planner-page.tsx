import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus } from 'lucide-react'
import { useState } from 'react'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { BudgetAllocationCard } from '@/components/planner/budget-allocation-card'
import { BudgetFormDialog } from '@/components/planner/budget-form-dialog'
import { PlannerMonthSelector } from '@/components/planner/planner-month-selector'
import { PlannerSummaryCards } from '@/components/planner/planner-summary-cards'
import { UnplannedSpendingList } from '@/components/planner/unplanned-spending-list'
import { Button } from '@/components/ui/button'
import type {
  BudgetAllocation,
  CreateBudgetAllocationInput,
  UpdateBudgetAllocationInput,
} from '@/data/models/budget'
import {
  formatBudgetMonth,
  getCurrentBudgetMonth,
  type PlannerBudgetRow,
} from '@/data/planner/planner-selectors'
import {
  getPlannerWorkspace,
  plannerMonthQueryKey,
} from '@/data/planner/planner-queries'
import { RepositoryDuplicateRecordError } from '@/data/repositories/common/repository-errors'
import { invalidateBudgetMutationData } from '@/lib/query-invalidation'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

type BudgetFormState = {
  budget?: BudgetAllocation
  initialCategoryId?: string
}

type ConfirmAction = {
  type: 'archive' | 'delete'
  allocation: BudgetAllocation
  categoryName: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export function PlannerPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentBudgetMonth)
  const [formState, setFormState] = useState<BudgetFormState | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const plannerQuery = useQuery({
    queryKey: [...plannerMonthQueryKey(selectedMonth), dataSourceKey],
    queryFn: () => getPlannerWorkspace(selectedMonth, dataSource),
  })
  const workspace = plannerQuery.data
  const loading = plannerQuery.isLoading
  const loadError = plannerQuery.error

  function handleBudgetSaveError(error: unknown) {
    if (error instanceof RepositoryDuplicateRecordError) {
      showToast({
        title: 'Duplicate budget allocation prevented',
        description:
          'Edit the existing allocation for this month and category instead.',
        variant: 'error',
      })
      return
    }

    showToast({
      title: 'Error saving budget',
      description: getErrorMessage(error),
      variant: 'error',
    })
  }

  const createBudgetMutation = useMutation({
    mutationFn: (input: CreateBudgetAllocationInput) =>
      dataSource.budgets.create(input),
    onSuccess: async () => {
      await invalidateBudgetMutationData(queryClient)
      showToast({
        title: 'Budget allocation created',
        description: 'The monthly category plan was saved locally.',
        variant: 'success',
      })
    },
    onError: handleBudgetSaveError,
  })
  const updateBudgetMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateBudgetAllocationInput
    }) => dataSource.budgets.update(id, input),
    onSuccess: async () => {
      await invalidateBudgetMutationData(queryClient)
      showToast({
        title: 'Budget allocation updated',
        description: 'The monthly category plan was updated.',
        variant: 'success',
      })
    },
    onError: handleBudgetSaveError,
  })
  const archiveBudgetMutation = useMutation({
    mutationFn: (id: string) => dataSource.budgets.archive(id),
    onSuccess: async () => {
      await invalidateBudgetMutationData(queryClient)
      showToast({
        title: 'Budget allocation archived',
        description: 'The allocation was removed from active planner views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving budget',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => dataSource.budgets.deleteSoft(id),
    onSuccess: async () => {
      await invalidateBudgetMutationData(queryClient)
      showToast({
        title: 'Budget allocation deleted',
        description: 'The allocation was soft deleted from active views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving budget',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting =
    archiveBudgetMutation.isPending || deleteBudgetMutation.isPending

  function openAddBudget(initialCategoryId?: string) {
    setFormState({ initialCategoryId })
  }

  function openEditBudget(row: PlannerBudgetRow) {
    setFormState({ budget: row.allocation })
  }

  async function createBudget(input: CreateBudgetAllocationInput) {
    try {
      await createBudgetMutation.mutateAsync(input)
      setFormState(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateBudget(
    id: string,
    input: UpdateBudgetAllocationInput,
  ) {
    try {
      await updateBudgetMutation.mutateAsync({ id, input })
      setFormState(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmBudgetAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveBudgetMutation.mutateAsync(confirmAction.allocation.id)
      } else {
        await deleteBudgetMutation.mutateAsync(confirmAction.allocation.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Planner"
      title="Planner"
      description="Plan monthly category spending and compare it with real expense transactions."
      breadcrumb={[{ label: 'More', href: '/more' }]}
      action={
        <Button
          type="button"
          onClick={() => openAddBudget()}
          disabled={loading}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Budget Category
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <PlannerMonthSelector
          month={selectedMonth}
          monthLabel={workspace?.monthLabel ?? formatBudgetMonth(selectedMonth)}
          onMonthChange={setSelectedMonth}
        />

        {loading ? (
          <LoadingState message="Loading planner..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && workspace ? (
          <>
            <PlannerSummaryCards summary={workspace.summary} />

            {!workspace.summary.hasBudgetAllocations ? (
              <EmptyState
                icon={ClipboardList}
                title="No budget planned for this month yet."
                message="Add category allocations to compare planned spending against actual expenses."
                action={
                  <Button type="button" onClick={() => openAddBudget()}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add Budget Category
                  </Button>
                }
              />
            ) : null}

            {workspace.budgetRows.length > 0 ? (
              <section className="grid gap-3 lg:grid-cols-2">
                {workspace.budgetRows.map((row) => (
                  <BudgetAllocationCard
                    key={row.id}
                    row={row}
                    onEdit={openEditBudget}
                    onArchive={(nextRow) =>
                      setConfirmAction({
                        type: 'archive',
                        allocation: nextRow.allocation,
                        categoryName: nextRow.categoryName,
                      })
                    }
                    onDelete={(nextRow) =>
                      setConfirmAction({
                        type: 'delete',
                        allocation: nextRow.allocation,
                        categoryName: nextRow.categoryName,
                      })
                    }
                  />
                ))}
              </section>
            ) : null}

            <UnplannedSpendingList
              rows={workspace.unplannedSpendingRows}
              onAddBudget={openAddBudget}
            />
          </>
        ) : null}
      </div>

      <BudgetFormDialog
        open={Boolean(formState)}
        budget={formState?.budget}
        expenseCategories={workspace?.expenseCategories ?? []}
        initialCategoryId={formState?.initialCategoryId}
        month={selectedMonth}
        onClose={() => setFormState(null)}
        onCreate={createBudget}
        onUpdate={updateBudget}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive budget allocation?'
            : 'Delete budget allocation?'
        }
        description={`Deleting this budget allocation will remove the plan for ${
          confirmAction?.categoryName ?? 'this category'
        } but will not delete any transactions. Continue?`}
        confirmLabel={
          confirmAction?.type === 'archive'
            ? 'Archive Allocation'
            : 'Delete Allocation'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmBudgetAction}
      />
    </PageShell>
  )
}
