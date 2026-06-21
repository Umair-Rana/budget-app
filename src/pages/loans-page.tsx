import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Landmark, Plus, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoanCard } from '@/components/loans/loan-card'
import { LoanFilterTabs } from '@/components/loans/loan-filter-tabs'
import { LoanFormDialog } from '@/components/loans/loan-form-dialog'
import { LoanPaymentDialog } from '@/components/loans/loan-payment-dialog'
import { LoanSummaryCards } from '@/components/loans/loan-summary-cards'
import {
  filterLoansByType,
  getLoanSummary,
  hasActiveLinkedLoanMovements,
  sortLoans,
} from '@/data/domain/loan-calculations'
import type { LoanFilterValue } from '@/data/display/loan-options'
import type { Account } from '@/data/models/account'
import type {
  CreateLoanInput,
  Loan,
  RecordLoanPaymentInput,
  UpdateLoanInput,
} from '@/data/models/loan'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const loansQueryKey = ['loans', 'active']
const accountsQueryKey = ['accounts', 'loans-page']
const transactionsQueryKey = ['transactions', 'loans-page']

type ConfirmAction =
  | {
      type: 'archive'
      loan: Loan
    }
  | {
      type: 'delete'
      loan: Loan
    }
  | {
      type: 'complete-payment'
      loan: Loan
      input: RecordLoanPaymentInput
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

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function confirmationTitle(action: ConfirmAction | null) {
  if (action?.type === 'archive') {
    return 'Archive loan?'
  }

  if (action?.type === 'delete') {
    return 'Delete loan?'
  }

  return 'Complete loan?'
}

function confirmationLabel(action: ConfirmAction | null) {
  if (action?.type === 'archive') {
    return 'Archive Loan'
  }

  if (action?.type === 'delete') {
    return 'Delete Loan'
  }

  return 'Record Final Repayment'
}

function confirmationDescription(action: ConfirmAction | null) {
  if (action?.type === 'complete-payment') {
    return 'This repayment will complete the loan and update the selected account balance. Continue?'
  }

  return 'Deleting this loan may also reverse linked loan movements and update affected account balances. Continue?'
}

export function LoansPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [filter, setFilter] = useState<LoanFilterValue>('given')
  const [formOpen, setFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | undefined>()
  const [paymentLoan, setPaymentLoan] = useState<Loan | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const loansQuery = useQuery({
    queryKey: [...loansQueryKey, dataSourceKey],
    queryFn: () => dataSource.loans.getAll(),
  })
  const accountsQuery = useQuery({
    queryKey: [...accountsQueryKey, dataSourceKey],
    queryFn: () => dataSource.accounts.getAll({ includeArchived: true }),
  })
  const transactionsQuery = useQuery({
    queryKey: [...transactionsQueryKey, dataSourceKey],
    queryFn: () => dataSource.transactions.getAll(),
  })

  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data])
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
  const accountsById = useMemo(() => createRecordMap(accounts), [accounts])
  const summary = useMemo(() => getLoanSummary(loans), [loans])
  const filteredLoans = useMemo(
    () => sortLoans(filterLoansByType(loans, filter)),
    [filter, loans],
  )
  const loading =
    loansQuery.isLoading ||
    accountsQuery.isLoading ||
    transactionsQuery.isLoading
  const loadError =
    loansQuery.error ?? accountsQuery.error ?? transactionsQuery.error

  const invalidateLoanData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['loans'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    ])
  }

  const createLoanMutation = useMutation({
    mutationFn: (input: CreateLoanInput) => dataSource.loans.create(input),
    onSuccess: async () => {
      await invalidateLoanData()
      showToast({
        title: 'Loan created',
        description: 'The loan and linked movement were saved locally.',
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
  const updateLoanMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateLoanInput
    }) => dataSource.loans.update(id, input),
    onSuccess: async () => {
      await invalidateLoanData()
      showToast({
        title: 'Loan updated',
        description: 'The loan changes were saved locally.',
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
  const archiveLoanMutation = useMutation({
    mutationFn: (id: string) => dataSource.loans.archive(id),
    onSuccess: async () => {
      await invalidateLoanData()
      showToast({
        title: 'Loan archived',
        description: 'The loan was removed from active loan views.',
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
  const deleteLoanMutation = useMutation({
    mutationFn: (id: string) => dataSource.loans.deleteSoft(id),
    onSuccess: async () => {
      await invalidateLoanData()
      showToast({
        title: 'Loan deleted',
        description: 'The loan was soft deleted from active views.',
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
  const recordPaymentMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: RecordLoanPaymentInput
    }) => dataSource.loans.recordPayment(id, input),
    onSuccess: async () => {
      await invalidateLoanData()
      showToast({
        title: 'Repayment recorded',
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
    archiveLoanMutation.isPending ||
    deleteLoanMutation.isPending ||
    recordPaymentMutation.isPending

  function openAddLoan() {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A loan needs an active account for balance impact.',
        variant: 'error',
      })
      return
    }

    setEditingLoan(undefined)
    setFormOpen(true)
  }

  function openEditLoan(loan: Loan) {
    setEditingLoan(loan)
    setFormOpen(true)
  }

  function openRecordPayment(loan: Loan) {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A repayment needs an active account for balance impact.',
        variant: 'error',
      })
      return
    }

    setPaymentLoan(loan)
  }

  async function createLoan(input: CreateLoanInput) {
    try {
      await createLoanMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateLoan(id: string, input: UpdateLoanInput) {
    try {
      await updateLoanMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function recordPayment(id: string, input: RecordLoanPaymentInput) {
    const loan = loans.find((nextLoan) => nextLoan.id === id)

    if (loan && input.amount === loan.outstandingAmount) {
      setConfirmAction({ type: 'complete-payment', loan, input })
      return
    }

    try {
      await recordPaymentMutation.mutateAsync({ id, input })
      setPaymentLoan(undefined)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmLoanAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveLoanMutation.mutateAsync(confirmAction.loan.id)
      } else if (confirmAction.type === 'delete') {
        await deleteLoanMutation.mutateAsync(confirmAction.loan.id)
      } else {
        await recordPaymentMutation.mutateAsync({
          id: confirmAction.loan.id,
          input: confirmAction.input,
        })
        setPaymentLoan(undefined)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      title="Loans"
      description="Track loans given and taken with linked neutral movements and real account balance impact."
      breadcrumb={[{ label: 'More', href: '/more' }]}
      action={
        <Button type="button" onClick={openAddLoan} disabled={loading}>
          <Plus className="size-4" aria-hidden="true" />
          Add Loan
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState message="Loading loans..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && activeAccounts.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title="Create an account before tracking loans."
            message="Loan creation and repayments need an active account so balance impact can be applied safely."
            action={
              <Button asChild>
                <Link to="/accounts">Open Accounts</Link>
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && loans.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No loans tracked yet."
            message="Add a loan you gave or took to start tracking balances."
            action={
              <Button type="button" onClick={openAddLoan}>
                <Plus className="size-4" aria-hidden="true" />
                Add Loan
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && loans.length > 0 ? (
          <>
            <LoanSummaryCards summary={summary} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <LoanFilterTabs value={filter} onChange={setFilter} />
              <p className="text-sm text-muted-foreground">
                {filteredLoans.length} loan
                {filteredLoans.length === 1 ? '' : 's'} shown
              </p>
            </div>

            {filteredLoans.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No loans match the selected filter.
                </CardContent>
              </Card>
            ) : null}

            {filteredLoans.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {filteredLoans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    accountsById={accountsById}
                    onArchive={(nextLoan) =>
                      setConfirmAction({ type: 'archive', loan: nextLoan })
                    }
                    onDelete={(nextLoan) =>
                      setConfirmAction({ type: 'delete', loan: nextLoan })
                    }
                    onEdit={openEditLoan}
                    onRecordPayment={openRecordPayment}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <LoanFormDialog
        open={formOpen}
        loan={editingLoan}
        accounts={activeAccounts}
        financialDetailsLocked={
          editingLoan
            ? hasActiveLinkedLoanMovements(editingLoan, transactions)
            : false
        }
        onClose={() => setFormOpen(false)}
        onCreate={createLoan}
        onUpdate={updateLoan}
      />

      <LoanPaymentDialog
        open={Boolean(paymentLoan)}
        loan={paymentLoan}
        accounts={activeAccounts}
        onClose={() => setPaymentLoan(undefined)}
        onSubmit={recordPayment}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={confirmationTitle(confirmAction)}
        description={confirmationDescription(confirmAction)}
        confirmLabel={confirmationLabel(confirmAction)}
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmLoanAction}
      />
    </PageShell>
  )
}
