import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Plus, ReceiptText, WalletCards, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmationDialog } from '@/components/app/confirmation-dialog'
import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { PageShell } from '@/components/app/page-shell'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { TransactionFormDialog } from '@/components/transactions/transaction-form-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getTransactionSortTimestamp } from '@/data/domain/transaction-datetime'
import type { Account } from '@/data/models/account'
import type { Category } from '@/data/models/category'
import type { Loan } from '@/data/models/loan'
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import {
  getTransactionTypeLabel,
  transactionSortOptions,
  transactionTypeOptions,
  type TransactionSortValue,
} from '@/data/display/transaction-options'
import { formatPkr } from '@/lib/formatting'
import { invalidateTransactionMutationData } from '@/lib/query-invalidation'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import { useToast } from '@/providers/toast-context'

const transactionsQueryKey = ['transactions', 'active']
const accountsQueryKey = ['accounts', 'transactions-page']
const categoriesQueryKey = ['categories', 'transactions-page']
const loansQueryKey = ['loans', 'transactions-page']

type TypeFilter = 'all' | TransactionType

const defaultSearchQuery = ''
const defaultTypeFilter: TypeFilter = 'all'
const defaultCategoryFilter = 'all'
const defaultAccountFilter = 'all'
const defaultDateFrom = ''
const defaultDateTo = ''
const defaultSortValue: TransactionSortValue = 'newest'

type ConfirmAction =
  | {
      type: 'archive'
      transaction: Transaction
    }
  | {
      type: 'delete'
      transaction: Transaction
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

function transactionTouchesAccount(transaction: Transaction, accountId: string) {
  return (
    transaction.fromAccountId === accountId || transaction.toAccountId === accountId
  )
}

function transactionSearchText(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>,
) {
  const categoryName = transaction.categoryId
    ? categoriesById.get(transaction.categoryId)?.name
    : undefined
  const fromAccountName = transaction.fromAccountId
    ? accountsById.get(transaction.fromAccountId)?.name
    : undefined
  const toAccountName = transaction.toAccountId
    ? accountsById.get(transaction.toAccountId)?.name
    : undefined

  return [
    transaction.notes,
    categoryName,
    fromAccountName,
    toAccountName,
    getTransactionTypeLabel(transaction.type),
    formatPkr(transaction.amount),
    String(transaction.amount),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function sortTransactions(
  transactions: Transaction[],
  sortValue: TransactionSortValue,
) {
  return [...transactions].sort((first, second) => {
    if (sortValue === 'oldest') {
      return (
        getTransactionSortTimestamp(first) - getTransactionSortTimestamp(second)
      )
    }

    if (sortValue === 'highest') {
      return second.amount - first.amount
    }

    if (sortValue === 'lowest') {
      return first.amount - second.amount
    }

    return (
      getTransactionSortTimestamp(second) - getTransactionSortTimestamp(first)
    )
  })
}

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(defaultTypeFilter)
  const [categoryFilter, setCategoryFilter] = useState(defaultCategoryFilter)
  const [accountFilter, setAccountFilter] = useState(defaultAccountFilter)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [sortValue, setSortValue] =
    useState<TransactionSortValue>(defaultSortValue)

  const transactionsQuery = useQuery({
    queryKey: [...transactionsQueryKey, dataSourceKey],
    queryFn: () => dataSource.transactions.getAll(),
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
  const loansQuery = useQuery({
    queryKey: [...loansQueryKey, dataSourceKey],
    queryFn: () => dataSource.loans.getAll({ includeArchived: true }),
  })

  const accounts = useMemo(
    () => accountsQuery.data ?? [],
    [accountsQuery.data],
  )
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )
  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data])
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
  const loansById = useMemo(
    () => createRecordMap<Loan>(loans),
    [loans],
  )
  const transactions = useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data],
  )
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const filtered = transactions.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false
      }

      if (
        categoryFilter !== 'all' &&
        transaction.categoryId !== categoryFilter
      ) {
        return false
      }

      if (
        accountFilter !== 'all' &&
        !transactionTouchesAccount(transaction, accountFilter)
      ) {
        return false
      }

      if (dateFrom && transaction.date < dateFrom) {
        return false
      }

      if (dateTo && transaction.date > dateTo) {
        return false
      }

      if (
        normalizedSearch &&
        !transactionSearchText(
          transaction,
          accountsById,
          categoriesById,
        ).includes(normalizedSearch)
      ) {
        return false
      }

      return true
    })

    return sortTransactions(filtered, sortValue)
  }, [
    accountFilter,
    accountsById,
    categoriesById,
    categoryFilter,
    dateFrom,
    dateTo,
    searchQuery,
    sortValue,
    transactions,
    typeFilter,
  ])

  const createTransactionMutation = useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      dataSource.transactions.create(input),
    onSuccess: async () => {
      await invalidateTransactionMutationData(queryClient)
      showToast({
        title: 'Transaction created',
        description: 'The transaction and account balance were saved.',
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
  const updateTransactionMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateTransactionInput
    }) => dataSource.transactions.update(id, input),
    onSuccess: async () => {
      await invalidateTransactionMutationData(queryClient)
      showToast({
        title: 'Transaction updated',
        description: 'Old balance impact was reversed and the new impact applied.',
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
  const archiveTransactionMutation = useMutation({
    mutationFn: (id: string) => dataSource.transactions.archive(id),
    onSuccess: async () => {
      await invalidateTransactionMutationData(queryClient)
      showToast({
        title: 'Transaction archived',
        description: 'The transaction impact was reversed from account balances.',
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
  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => dataSource.transactions.deleteSoft(id),
    onSuccess: async () => {
      await invalidateTransactionMutationData(queryClient)
      showToast({
        title: 'Transaction deleted',
        description: 'The transaction was soft deleted and balance impact reversed.',
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

  const confirmSubmitting =
    archiveTransactionMutation.isPending || deleteTransactionMutation.isPending
  const loading =
    transactionsQuery.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading ||
    loansQuery.isLoading
  const loadError =
    transactionsQuery.error ??
    accountsQuery.error ??
    categoriesQuery.error ??
    loansQuery.error
  const noAccounts = !loading && !loadError && activeAccounts.length === 0
  const noCategories = !loading && !loadError && activeCategories.length === 0
  const hasActiveFilters =
    searchQuery !== defaultSearchQuery ||
    typeFilter !== defaultTypeFilter ||
    categoryFilter !== defaultCategoryFilter ||
    accountFilter !== defaultAccountFilter ||
    dateFrom !== defaultDateFrom ||
    dateTo !== defaultDateTo ||
    sortValue !== defaultSortValue

  function openAddTransaction() {
    setEditingTransaction(undefined)
    setFormOpen(true)
  }

  function openEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction)
    setFormOpen(true)
  }

  function clearFilters() {
    setSearchQuery(defaultSearchQuery)
    setTypeFilter(defaultTypeFilter)
    setCategoryFilter(defaultCategoryFilter)
    setAccountFilter(defaultAccountFilter)
    setDateFrom(defaultDateFrom)
    setDateTo(defaultDateTo)
    setSortValue(defaultSortValue)
  }

  async function createTransaction(input: CreateTransactionInput) {
    try {
      await createTransactionMutation.mutateAsync(input)
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function updateTransaction(id: string, input: UpdateTransactionInput) {
    try {
      await updateTransactionMutation.mutateAsync({ id, input })
      setFormOpen(false)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  async function confirmTransactionAction() {
    if (!confirmAction) {
      return
    }

    try {
      if (confirmAction.type === 'archive') {
        await archiveTransactionMutation.mutateAsync(confirmAction.transaction.id)
      } else {
        await deleteTransactionMutation.mutateAsync(confirmAction.transaction.id)
      }

      setConfirmAction(null)
    } catch {
      // The mutation owns toast feedback.
    }
  }

  return (
    <PageShell
      eyebrow="Transactions"
      title="Transactions"
      description="Create, edit, archive, and search standalone transactions with account balance impact."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/recurring">
              <CalendarClock className="size-4" aria-hidden="true" />
              Recurring
            </Link>
          </Button>
          <Button
            type="button"
            onClick={openAddTransaction}
            disabled={noAccounts || loading}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Transaction
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <LoadingState message="Loading transactions..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {noAccounts ? (
          <EmptyState
            icon={WalletCards}
            title="Create an account first."
            message="Transactions need at least one active account so balance impact can be applied correctly."
            action={
              <Button asChild>
                <Link to="/accounts">Open Accounts</Link>
              </Button>
            }
          />
        ) : null}

        {noCategories ? (
          <Card>
            <CardContent className="p-5 text-sm leading-6 text-muted-foreground">
              No active categories are available. Default categories are checked
              automatically; open Settings if you archived or deleted them.
            </CardContent>
          </Card>
        ) : null}

        {!loading && !loadError && !noAccounts ? (
          <>
            <Card>
              <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))_auto]">
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
                  placeholder="Search notes, category, account, or amount"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as TypeFilter)
                  }
                >
                  <option value="all">All types</option>
                  {transactionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value)}
                >
                  <option value="all">All accounts</option>
                  {activeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Start date"
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
                <input
                  type="date"
                  aria-label="End date"
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  value={sortValue}
                  onChange={(event) =>
                    setSortValue(event.target.value as TransactionSortValue)
                  }
                >
                  {transactionSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 justify-self-start xl:justify-self-end"
                    onClick={clearFilters}
                  >
                    <X className="size-4" aria-hidden="true" />
                    Clear Filters
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {transactions.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ReceiptText className="size-6" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-foreground">
                    No transactions yet.
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Add your first income, expense, transfer, or adjustment.
                  </p>
                  <Button type="button" className="mt-5" onClick={openAddTransaction}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add Transaction
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {transactions.length > 0 && filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No transactions match the current filters.
                </CardContent>
              </Card>
            ) : null}

            {filteredTransactions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {filteredTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    accountsById={accountsById}
                    categoriesById={categoriesById}
                    loansById={loansById}
                    onEdit={openEditTransaction}
                    onArchive={(nextTransaction) =>
                      setConfirmAction({
                        type: 'archive',
                        transaction: nextTransaction,
                      })
                    }
                    onDelete={(nextTransaction) =>
                      setConfirmAction({
                        type: 'delete',
                        transaction: nextTransaction,
                      })
                    }
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <TransactionFormDialog
        open={formOpen}
        transaction={editingTransaction}
        accounts={activeAccounts}
        categories={activeCategories}
        onClose={() => setFormOpen(false)}
        onCreate={createTransaction}
        onUpdate={updateTransaction}
      />

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'archive'
            ? 'Archive transaction?'
            : 'Delete transaction?'
        }
        description={
          confirmAction?.type === 'archive'
            ? 'Archiving this transaction will update the affected account balance. Continue?'
            : 'Deleting this transaction will update the affected account balance. Continue?'
        }
        confirmLabel={
          confirmAction?.type === 'archive'
            ? 'Archive Transaction'
            : 'Delete Transaction'
        }
        destructive={confirmAction?.type === 'delete'}
        isSubmitting={confirmSubmitting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmTransactionAction}
      />
    </PageShell>
  )
}
