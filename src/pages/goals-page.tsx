import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, PiggyBank, Plus, Target, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { SummaryStatCard } from '@/components/app/summary-stat-card'
import { GoalCard } from '@/components/goals/goal-card'
import { GoalFormDialog } from '@/components/goals/goal-form-dialog'
import { GoalMovementDialog } from '@/components/goals/goal-movement-dialog'
import { Button } from '@/components/ui/button'
import type { Account } from '@/data/models/account'
import type {
  AddGoalContributionInput,
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
  WithdrawFromGoalInput,
} from '@/data/models/goal'
import type { Transaction } from '@/data/models/transaction'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import { formatPkr } from '@/lib/formatting'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const goalsQueryKey = ['goals', 'active']
const accountsQueryKey = ['accounts', 'goals-page']
const transactionsQueryKey = ['transactions', 'goals-page']

type GoalMovementType = 'contribution' | 'withdrawal'

type ConfirmAction =
  | {
      type: 'archive'
      goal: Goal
    }
  | {
      type: 'delete'
      goal: Goal
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

function sortGoals(goals: Goal[]) {
  const priorityRank = {
    high: 0,
    medium: 1,
    low: 2,
  }

  return [...goals].sort((first, second) => {
    if (first.status === 'completed' && second.status !== 'completed') {
      return 1
    }

    if (first.status !== 'completed' && second.status === 'completed') {
      return -1
    }

    const priorityDifference =
      priorityRank[first.priority] - priorityRank[second.priority]

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    if (first.targetDate && second.targetDate) {
      return first.targetDate.localeCompare(second.targetDate)
    }

    if (first.targetDate) {
      return -1
    }

    if (second.targetDate) {
      return 1
    }

    return first.name.localeCompare(second.name)
  })
}

function hasLinkedGoalMovements(goal: Goal, transactions: Transaction[]) {
  return transactions.some(
    (transaction) =>
      transaction.linkedGoalId === goal.id &&
      !transaction.archivedAt &&
      !transaction.deletedAt,
  )
}

export function GoalsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
  const [movementGoal, setMovementGoal] = useState<Goal | undefined>()
  const [movementType, setMovementType] =
    useState<GoalMovementType>('contribution')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const goalsQuery = useQuery({
    queryKey: [...goalsQueryKey, dataSourceKey],
    queryFn: () => dataSource.goals.getAll(),
  })
  const accountsQuery = useQuery({
    queryKey: [...accountsQueryKey, dataSourceKey],
    queryFn: () => dataSource.accounts.getAll({ includeArchived: true }),
  })
  const transactionsQuery = useQuery({
    queryKey: [...transactionsQueryKey, dataSourceKey],
    queryFn: () => dataSource.transactions.getAll(),
  })

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data])
  const accounts = useMemo(
    () => accountsQuery.data ?? [],
    [accountsQuery.data],
  )
  const transactions = useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data],
  )
  const activeAccounts = useMemo(
    () => accounts.filter(isActiveAccount),
    [accounts],
  )
  const sortedGoals = useMemo(() => sortGoals(goals), [goals])
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const totalTargetAmount = goals.reduce(
    (total, goal) => total + goal.targetAmount,
    0,
  )
  const totalSavedAmount = goals.reduce(
    (total, goal) => total + goal.currentAmount,
    0,
  )
  const remainingAmount = Math.max(totalTargetAmount - totalSavedAmount, 0)
  const loading =
    goalsQuery.isLoading || accountsQuery.isLoading || transactionsQuery.isLoading
  const loadError =
    goalsQuery.error ?? accountsQuery.error ?? transactionsQuery.error

  const invalidateGoalData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    ])
  }

  const createGoalMutation = useMutation({
    mutationFn: (input: CreateGoalInput) => dataSource.goals.create(input),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Goal created',
        description: 'The goal was saved locally.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving goal',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const updateGoalMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateGoalInput
    }) => dataSource.goals.update(id, input),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Goal updated',
        description: 'The goal changes were saved locally.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving goal',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const archiveGoalMutation = useMutation({
    mutationFn: (id: string) => dataSource.goals.archive(id),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Goal archived',
        description: 'The goal was removed from active goal views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving goal',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => dataSource.goals.deleteSoft(id),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Goal deleted',
        description: 'The goal was soft deleted from active views.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving goal',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const addContributionMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: AddGoalContributionInput
    }) => dataSource.goals.addContribution(id, input),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Contribution added',
        description: 'The linked movement and account balance were updated.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error updating account balance',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const withdrawMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: WithdrawFromGoalInput
    }) => dataSource.goals.withdraw(id, input),
    onSuccess: async () => {
      await invalidateGoalData()
      showToast({
        title: 'Withdrawal completed',
        description: 'The linked movement and account balance were updated.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error updating account balance',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const confirmSubmitting =
    archiveGoalMutation.isPending || deleteGoalMutation.isPending

  function openAddGoal() {
    setEditingGoal(undefined)
    setFormOpen(true)
  }

  function openEditGoal(goal: Goal) {
    setEditingGoal(goal)
    setFormOpen(true)
  }

  function openMovement(goal: Goal, nextMovementType: GoalMovementType) {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A goal movement needs an active account for balance impact.',
        variant: 'error',
      })
      return
    }

    setMovementType(nextMovementType)
    setMovementGoal(goal)
  }

  async function createGoal(input: CreateGoalInput) {
    try {
      await createGoalMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateGoal(id: string, input: UpdateGoalInput) {
    try {
      await updateGoalMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function addContribution(
    id: string,
    input: AddGoalContributionInput,
  ) {
    try {
      await addContributionMutation.mutateAsync({ id, input })
      setMovementGoal(undefined)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function withdraw(id: string, input: WithdrawFromGoalInput) {
    try {
      await withdrawMutation.mutateAsync({ id, input })
      setMovementGoal(undefined)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmGoalAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveGoalMutation.mutateAsync(confirmAction.goal.id)
      } else {
        await deleteGoalMutation.mutateAsync(confirmAction.goal.id)
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

    const linkedMovements = hasLinkedGoalMovements(action.goal, transactions)

    if (linkedMovements) {
      return `${
        action.type === 'archive' ? 'Archiving' : 'Deleting'
      } this goal may also affect linked goal movements and account balances. Continue?`
    }

    return 'Deleting this goal will remove it from your goals list. Continue?'
  }

  return (
    <PageShell
      eyebrow="Goals"
      title="Goals"
      description="Create savings targets, then add contributions or withdrawals as linked neutral movements."
      action={
        <Button type="button" onClick={openAddGoal} disabled={loading}>
          <Plus className="size-4" aria-hidden="true" />
          Add Goal
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState message="Loading goals..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet."
            message="Add a savings goal to start tracking target progress."
            action={
              <Button type="button" onClick={openAddGoal}>
                <Plus className="size-4" aria-hidden="true" />
                Add Goal
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && goals.length > 0 ? (
          <>
            {activeAccounts.length === 0 ? (
              <EmptyState
                icon={WalletCards}
                title="Create an account before moving money."
                message="Goals can be created now, but contributions and withdrawals need an active account."
                action={
                  <Button asChild>
                    <Link to="/accounts">Open Accounts</Link>
                  </Button>
                }
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard
                icon={Target}
                label="Active goals"
                value={String(activeGoals.length)}
                tone="info"
              />
              <SummaryStatCard
                icon={Flag}
                label="Total target"
                value={formatPkr(totalTargetAmount)}
              />
              <SummaryStatCard
                icon={PiggyBank}
                label="Total saved"
                value={formatPkr(totalSavedAmount)}
                tone="success"
              />
              <SummaryStatCard
                icon={WalletCards}
                label="Remaining"
                value={formatPkr(remainingAmount)}
                tone={remainingAmount > 0 ? 'warning' : 'success'}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {sortedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onArchive={(nextGoal) =>
                    setConfirmAction({ type: 'archive', goal: nextGoal })
                  }
                  onContribute={(nextGoal) =>
                    openMovement(nextGoal, 'contribution')
                  }
                  onDelete={(nextGoal) =>
                    setConfirmAction({ type: 'delete', goal: nextGoal })
                  }
                  onEdit={openEditGoal}
                  onWithdraw={(nextGoal) => openMovement(nextGoal, 'withdrawal')}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <GoalFormDialog
        open={formOpen}
        goal={editingGoal}
        currentAmountLocked={
          editingGoal ? hasLinkedGoalMovements(editingGoal, transactions) : false
        }
        onClose={() => setFormOpen(false)}
        onCreate={createGoal}
        onUpdate={updateGoal}
      />

      <GoalMovementDialog
        open={Boolean(movementGoal)}
        goal={movementGoal}
        movementType={movementType}
        accounts={activeAccounts}
        onClose={() => setMovementGoal(undefined)}
        onContribute={addContribution}
        onWithdraw={withdraw}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive goal?'
            : 'Delete goal?'
        }
        description={confirmationDescription(confirmAction)}
        confirmLabel={
          confirmAction?.type === 'archive' ? 'Archive Goal' : 'Delete Goal'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmGoalAction}
      />
    </PageShell>
  )
}
