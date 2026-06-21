import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { BillFormDialog } from '@/components/bills/bill-form-dialog'
import { GoalFormDialog } from '@/components/goals/goal-form-dialog'
import { LoanFormDialog } from '@/components/loans/loan-form-dialog'
import { OverviewEmptyGuide } from '@/components/overview/overview-empty-guide'
import { OverviewGoalsSnapshot } from '@/components/overview/overview-goals-snapshot'
import { OverviewLoansSnapshot } from '@/components/overview/overview-loans-snapshot'
import { OverviewMetricCards } from '@/components/overview/overview-metric-cards'
import { OverviewNotifications } from '@/components/overview/overview-notifications'
import { OverviewQuickActions } from '@/components/overview/overview-quick-actions'
import { OverviewRecentTransactions } from '@/components/overview/overview-recent-transactions'
import { OverviewUpcomingBills } from '@/components/overview/overview-upcoming-bills'
import { TransactionFormDialog } from '@/components/transactions/transaction-form-dialog'
import { Button } from '@/components/ui/button'
import {
  getOverviewDashboard,
  overviewDashboardQueryKey,
} from '@/data/dashboard/dashboard-queries'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import type { CreateBillInput } from '@/data/models/bill'
import type { CreateGoalInput } from '@/data/models/goal'
import type { CreateLoanInput } from '@/data/models/loan'
import type { CreateTransactionInput } from '@/data/models/transaction'
import {
  defaultCurrency,
  defaultDateFormat,
  defaultLocale,
} from '@/lib/formatting'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

type OverviewDialog = 'transaction' | 'bill' | 'goal' | 'loan' | null

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export function OverviewPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [openDialog, setOpenDialog] = useState<OverviewDialog>(null)
  const dashboardQuery = useQuery({
    queryKey: [...overviewDashboardQueryKey, dataSourceKey],
    queryFn: () => getOverviewDashboard(dataSource),
  })
  const dashboard = dashboardQuery.data
  const activeAccounts = dashboard?.activeAccounts ?? []
  const activeCategories = dashboard?.activeCategories ?? []
  const expenseCategories = dashboard?.expenseCategories ?? []
  const loading = dashboardQuery.isLoading
  const loadError = dashboardQuery.error

  const invalidateDashboardData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['bills'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['loans'] }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    ])
  }

  const createTransactionMutation = useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      dataSource.transactions.create(input),
    onSuccess: async () => {
      await invalidateDashboardData()
      showToast({
        title: 'Transaction created',
        description: 'The dashboard was updated with the new transaction.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving transaction',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const createBillMutation = useMutation({
    mutationFn: (input: CreateBillInput) => dataSource.bills.create(input),
    onSuccess: async () => {
      await invalidateDashboardData()
      showToast({
        title: 'Bill created',
        description: 'The dashboard was updated with the new bill.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving bill',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const createGoalMutation = useMutation({
    mutationFn: (input: CreateGoalInput) => dataSource.goals.create(input),
    onSuccess: async () => {
      await invalidateDashboardData()
      showToast({
        title: 'Goal created',
        description: 'The dashboard was updated with the new goal.',
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
  const createLoanMutation = useMutation({
    mutationFn: (input: CreateLoanInput) => dataSource.loans.create(input),
    onSuccess: async () => {
      await invalidateDashboardData()
      showToast({
        title: 'Loan created',
        description: 'The dashboard was updated with the new loan.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error saving loan',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  function openTransactionDialog() {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A transaction needs an active account for balance impact.',
        variant: 'error',
      })
      return
    }

    setOpenDialog('transaction')
  }

  function openLoanDialog() {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A loan needs an active account for balance impact.',
        variant: 'error',
      })
      return
    }

    setOpenDialog('loan')
  }

  async function createTransaction(input: CreateTransactionInput) {
    try {
      await createTransactionMutation.mutateAsync(input)
      setOpenDialog(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function createBill(input: CreateBillInput) {
    try {
      await createBillMutation.mutateAsync(input)
      setOpenDialog(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function createGoal(input: CreateGoalInput) {
    try {
      await createGoalMutation.mutateAsync(input)
      setOpenDialog(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function createLoan(input: CreateLoanInput) {
    try {
      await createLoanMutation.mutateAsync(input)
      setOpenDialog(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Overview"
      title="Household money snapshot"
      description="A cloud dashboard built from your Supabase household records."
      action={
        <Button
          type="button"
          onClick={openTransactionDialog}
          disabled={loading}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Transaction
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState message="Loading overview..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && dashboard && !dashboard.hasAnyData ? (
          <OverviewEmptyGuide />
        ) : null}

        {!loading && !loadError && dashboard && dashboard.hasAnyData ? (
          <>
            <div className="rounded-lg border bg-card/70 px-4 py-3 text-xs text-muted-foreground shadow-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-medium text-foreground">
                  Display settings
                </span>
                <span>
                  Currency{' '}
                  <span className="font-medium text-foreground">
                    {defaultCurrency}
                  </span>
                </span>
                <span>
                  Locale{' '}
                  <span className="font-medium text-foreground">
                    {defaultLocale}
                  </span>
                </span>
                <span>
                  Dates{' '}
                  <span className="font-medium text-foreground">
                    {defaultDateFormat}
                  </span>
                </span>
              </div>
            </div>

            <OverviewMetricCards metrics={dashboard.metrics} />

            <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
              <OverviewRecentTransactions
                transactions={dashboard.recentTransactions}
              />
              <div className="flex flex-col gap-3">
                <OverviewQuickActions
                  disabled={loading}
                  onAddTransaction={openTransactionDialog}
                  onAddBill={() => setOpenDialog('bill')}
                  onAddGoal={() => setOpenDialog('goal')}
                  onAddLoan={openLoanDialog}
                />
                <OverviewLoansSnapshot loanSummary={dashboard.loanSummary} />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <OverviewUpcomingBills bills={dashboard.upcomingBills} />
              <OverviewGoalsSnapshot goals={dashboard.goalsSnapshot} />
            </div>

            <OverviewNotifications />
          </>
        ) : null}
      </div>

      <TransactionFormDialog
        open={openDialog === 'transaction'}
        accounts={activeAccounts}
        categories={activeCategories}
        onClose={() => setOpenDialog(null)}
        onCreate={createTransaction}
        onUpdate={async () => undefined}
      />

      <BillFormDialog
        open={openDialog === 'bill'}
        expenseCategories={expenseCategories}
        onClose={() => setOpenDialog(null)}
        onCreate={createBill}
        onUpdate={async () => undefined}
      />

      <GoalFormDialog
        open={openDialog === 'goal'}
        onClose={() => setOpenDialog(null)}
        onCreate={createGoal}
        onUpdate={async () => undefined}
      />

      <LoanFormDialog
        open={openDialog === 'loan'}
        accounts={activeAccounts}
        onClose={() => setOpenDialog(null)}
        onCreate={createLoan}
        onUpdate={async () => undefined}
      />
    </PageShell>
  )
}
