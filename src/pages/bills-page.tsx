import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Plus, Receipt, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { SummaryStatCard } from '@/components/app/summary-stat-card'
import { BillCard } from '@/components/bills/bill-card'
import { BillFormDialog } from '@/components/bills/bill-form-dialog'
import { BillPaymentDialog } from '@/components/bills/bill-payment-dialog'
import { Button } from '@/components/ui/button'
import type { Account } from '@/data/models/account'
import type {
  Bill,
  CreateBillInput,
  MarkBillPaidInput,
  UpdateBillInput,
} from '@/data/models/bill'
import type { Category } from '@/data/models/category'
import { notificationsQueryKey } from '@/data/notifications/notification-queries'
import { formatPkr } from '@/lib/formatting'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const billsQueryKey = ['bills', 'active']
const accountsQueryKey = ['accounts', 'bills-page']
const categoriesQueryKey = ['categories', 'bills-page']
const transactionsQueryKey = ['transactions', 'bills-page']

type ConfirmAction =
  | {
      type: 'archive'
      bill: Bill
    }
  | {
      type: 'delete'
      bill: Bill
    }
  | {
      type: 'unpaid'
      bill: Bill
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

function isActiveExpenseCategory(category: Category) {
  return (
    category.type === 'expense' && !category.archivedAt && !category.deletedAt
  )
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function currentMonthPrefix() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function sortBills(bills: Bill[]) {
  return [...bills].sort((first, second) => {
    if (first.status === 'paid' && second.status !== 'paid') {
      return 1
    }

    if (first.status !== 'paid' && second.status === 'paid') {
      return -1
    }

    return first.dueDate.localeCompare(second.dueDate)
  })
}

export function BillsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | undefined>()
  const [paymentBill, setPaymentBill] = useState<Bill | undefined>()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const billsQuery = useQuery({
    queryKey: [...billsQueryKey, dataSourceKey],
    queryFn: () => dataSource.bills.getAll(),
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
  const transactionsQuery = useQuery({
    queryKey: [...transactionsQueryKey, dataSourceKey],
    queryFn: () => dataSource.transactions.getAll(),
  })

  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data])
  const accounts = useMemo(
    () => accountsQuery.data ?? [],
    [accountsQuery.data],
  )
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const transactions = useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data],
  )
  const activeAccounts = useMemo(
    () => accounts.filter(isActiveAccount),
    [accounts],
  )
  const expenseCategories = useMemo(
    () => categories.filter(isActiveExpenseCategory),
    [categories],
  )
  const accountsById = useMemo(() => createRecordMap(accounts), [accounts])
  const categoriesById = useMemo(() => createRecordMap(categories), [categories])
  const transactionsById = useMemo(
    () => createRecordMap(transactions),
    [transactions],
  )
  const sortedBills = useMemo(() => sortBills(bills), [bills])
  const currentMonth = currentMonthPrefix()
  const pendingBills = bills.filter((bill) => bill.status === 'pending')
  const overdueBills = bills.filter((bill) => bill.status === 'overdue')
  const upcomingBills = bills.filter((bill) => bill.status === 'upcoming')
  const paidThisMonthTotal = bills
    .filter((bill) => {
      if (bill.status !== 'paid' || !bill.linkedTransactionId) {
        return false
      }

      const transaction = transactionsById.get(bill.linkedTransactionId)

      return transaction?.date.startsWith(currentMonth)
    })
    .reduce((total, bill) => total + bill.amount, 0)

  const loading =
    billsQuery.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading ||
    transactionsQuery.isLoading
  const loadError =
    billsQuery.error ??
    accountsQuery.error ??
    categoriesQuery.error ??
    transactionsQuery.error

  const invalidateBillData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['bills'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    ])
  }

  const createBillMutation = useMutation({
    mutationFn: (input: CreateBillInput) => dataSource.bills.create(input),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill created',
        description: 'The bill was saved locally.',
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
  const updateBillMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateBillInput
    }) => dataSource.bills.update(id, input),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill updated',
        description: 'The bill changes were saved locally.',
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
  const archiveBillMutation = useMutation({
    mutationFn: (id: string) => dataSource.bills.archive(id),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill archived',
        description: 'The bill was removed from active bill views.',
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
  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => dataSource.bills.deleteSoft(id),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill deleted',
        description: 'The bill was soft deleted from active views.',
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
  const markPaidMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: MarkBillPaidInput
    }) => dataSource.bills.markPaid(id, input),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill marked paid',
        description: 'A linked expense transaction was created.',
        variant: 'success',
      })
    },
    onError: (error) => {
      showToast({
        title: 'Error creating linked transaction',
        description: getErrorMessage(error),
        variant: 'error',
      })
    },
  })
  const markUnpaidMutation = useMutation({
    mutationFn: (id: string) => dataSource.bills.markUnpaid(id),
    onSuccess: async () => {
      await invalidateBillData()
      showToast({
        title: 'Bill marked unpaid',
        description: 'The linked expense was removed and balance impact reversed.',
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

  const confirmSubmitting =
    archiveBillMutation.isPending ||
    deleteBillMutation.isPending ||
    markUnpaidMutation.isPending

  function openAddBill() {
    setEditingBill(undefined)
    setFormOpen(true)
  }

  function openEditBill(bill: Bill) {
    setEditingBill(bill)
    setFormOpen(true)
  }

  function openMarkPaid(bill: Bill) {
    if (activeAccounts.length === 0) {
      showToast({
        title: 'Create an account first',
        description: 'A payment account is required before a bill can be paid.',
        variant: 'error',
      })
      return
    }

    setPaymentBill(bill)
  }

  async function createBill(input: CreateBillInput) {
    try {
      await createBillMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateBill(id: string, input: UpdateBillInput) {
    try {
      await updateBillMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function markPaid(id: string, input: MarkBillPaidInput) {
    try {
      await markPaidMutation.mutateAsync({ id, input })
      setPaymentBill(undefined)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmBillAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveBillMutation.mutateAsync(confirmAction.bill.id)
      } else if (confirmAction.type === 'delete') {
        await deleteBillMutation.mutateAsync(confirmAction.bill.id)
      } else {
        await markUnpaidMutation.mutateAsync(confirmAction.bill.id)
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

    if (action.type === 'unpaid') {
      return 'Marking this bill as unpaid will remove its linked expense and adjust the affected account balance. Continue?'
    }

    if (action.bill.status === 'paid') {
      return 'Deleting this paid bill will also remove its linked expense transaction and adjust the affected account balance. Continue?'
    }

    return 'Deleting this bill will remove it from your bill list. Continue?'
  }

  return (
    <PageShell
      eyebrow="Bills"
      title="Bills"
      description="Plan upcoming bills, then mark them paid to create linked expense transactions."
      action={
        <Button type="button" onClick={openAddBill} disabled={loading}>
          <Plus className="size-4" aria-hidden="true" />
          Add Bill
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState message="Loading bills..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills yet."
            message="Add recurring or one-time bills to plan upcoming expenses."
            action={
              <Button type="button" onClick={openAddBill}>
                <Plus className="size-4" aria-hidden="true" />
                Add Bill
              </Button>
            }
          />
        ) : null}

        {!loading && !loadError && bills.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard
                icon={Clock}
                label="Pending bills"
                value={String(pendingBills.length)}
                tone="warning"
              />
              <SummaryStatCard
                icon={CheckCircle2}
                label="Paid this month"
                value={formatPkr(paidThisMonthTotal)}
                tone="success"
              />
              <SummaryStatCard
                icon={TriangleAlert}
                label="Overdue bills"
                value={String(overdueBills.length)}
                tone="danger"
              />
              <SummaryStatCard
                icon={Receipt}
                label="Upcoming bills"
                value={String(upcomingBills.length)}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {sortedBills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  accountsById={accountsById}
                  categoriesById={categoriesById}
                  onEdit={openEditBill}
                  onMarkPaid={openMarkPaid}
                  onMarkUnpaid={(nextBill) =>
                    setConfirmAction({ type: 'unpaid', bill: nextBill })
                  }
                  onArchive={(nextBill) =>
                    setConfirmAction({ type: 'archive', bill: nextBill })
                  }
                  onDelete={(nextBill) =>
                    setConfirmAction({ type: 'delete', bill: nextBill })
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <BillFormDialog
        open={formOpen}
        bill={editingBill}
        expenseCategories={expenseCategories}
        onClose={() => setFormOpen(false)}
        onCreate={createBill}
        onUpdate={updateBill}
      />

      <BillPaymentDialog
        open={Boolean(paymentBill)}
        bill={paymentBill}
        accounts={activeAccounts}
        onClose={() => setPaymentBill(undefined)}
        onSubmit={markPaid}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'unpaid'
            ? 'Mark bill unpaid?'
            : confirmAction?.type === 'archive'
              ? 'Archive bill?'
              : 'Delete bill?'
        }
        description={confirmationDescription(confirmAction)}
        confirmLabel={
          confirmAction?.type === 'unpaid'
            ? 'Mark Unpaid'
            : confirmAction?.type === 'archive'
              ? 'Archive Bill'
              : 'Delete Bill'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmBillAction}
      />
    </PageShell>
  )
}
