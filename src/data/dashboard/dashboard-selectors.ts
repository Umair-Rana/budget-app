import { getBillStatusLabel } from '@/data/display/bill-options'
import { getGoalStatusLabel } from '@/data/display/goal-options'
import { getLoanSummary } from '@/data/domain/loan-calculations'
import {
  getTransactionDisplayTime,
  getTransactionSortTimestamp,
} from '@/data/domain/transaction-datetime'
import type { Account } from '@/data/models/account'
import type { Bill } from '@/data/models/bill'
import type { Category } from '@/data/models/category'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import { formatDisplayDate, formatPkr } from '@/lib/formatting'

export type DashboardLinkedOrigin = {
  label: 'Bill' | 'Goal' | 'Loan'
  href: string
}

export type DashboardRecentTransaction = {
  id: string
  title: string
  subtitle: string
  amountText: string
  amountTone: 'default' | 'success' | 'info'
  dateLabel: string
  iconKind: 'income' | 'expense' | 'transfer' | 'adjustment' | 'bill' | 'goal' | 'loan'
  categoryColor?: string
  categoryIcon?: string
  origin?: DashboardLinkedOrigin
}

export type DashboardUpcomingBill = {
  id: string
  name: string
  amountText: string
  dueDateLabel: string
  status: Bill['status']
  statusLabel: string
}

export type DashboardGoalSnapshot = {
  id: string
  name: string
  currentAmountText: string
  targetAmountText: string
  remainingAmountText: string
  progressPercent: number
  statusLabel: string
}

export type DashboardLoanSummary = {
  totalReceivableText: string
  totalPayableText: string
}

export function isActiveRecord(record: { archivedAt?: string; deletedAt?: string }) {
  return !record.archivedAt && !record.deletedAt
}

export function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

export function getActiveAccounts(accounts: Account[]) {
  return accounts.filter(isActiveRecord)
}

export function getActiveCategories(categories: Category[]) {
  return categories.filter(isActiveRecord)
}

export function getActiveExpenseCategories(categories: Category[]) {
  return getActiveCategories(categories).filter(
    (category) => category.type === 'expense',
  )
}

export function getAvailableBalance(accounts: Account[]) {
  return getActiveAccounts(accounts).reduce(
    (total, account) => total + account.currentBalance,
    0,
  )
}

export function getCurrentMonthPrefix(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function getMonthlyIncome(transactions: Transaction[], now = new Date()) {
  const monthPrefix = getCurrentMonthPrefix(now)

  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'income' && transaction.date.startsWith(monthPrefix),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function getMonthlyExpenses(
  transactions: Transaction[],
  now = new Date(),
) {
  const monthPrefix = getCurrentMonthPrefix(now)

  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        transaction.date.startsWith(monthPrefix),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function getBudgetRemaining(monthlyIncome: number, monthlyExpenses: number) {
  // Temporary until Planner budgets exist. Replace this selector with planned
  // budget allocation math when the Planner/Budget module is implemented.
  return monthlyIncome - monthlyExpenses
}

function getAccountName(accountsById: Map<string, Account>, accountId?: string) {
  if (!accountId) {
    return 'No account'
  }

  return accountsById.get(accountId)?.name ?? 'Unknown account'
}

function getTransactionTitle(
  transaction: Transaction,
  categoriesById: Map<string, Category>,
  loansById: Map<string, Loan>,
) {
  const category = transaction.categoryId
    ? categoriesById.get(transaction.categoryId)
    : undefined

  if (transaction.linkedBillId) {
    return category?.name ?? 'Bill Payment'
  }

  if (transaction.linkedGoalId && transaction.type === 'transfer') {
    return transaction.fromAccountId ? 'Goal Contribution' : 'Goal Withdrawal'
  }

  if (transaction.linkedLoanId && transaction.type === 'transfer') {
    const loan = loansById.get(transaction.linkedLoanId)

    if (loan?.type === 'given') {
      return transaction.fromAccountId
        ? 'Loan Given'
        : 'Loan Repayment Received'
    }

    if (loan?.type === 'taken') {
      return transaction.toAccountId ? 'Loan Taken' : 'Loan Repayment Made'
    }

    return 'Loan Movement'
  }

  if (transaction.type === 'adjustment') {
    return 'Balance Adjustment'
  }

  return category?.name ?? transaction.type
}

function getTransactionSubtitle(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  categoriesById: Map<string, Category>,
  loansById: Map<string, Loan>,
) {
  const category = transaction.categoryId
    ? categoriesById.get(transaction.categoryId)
    : undefined

  if (transaction.linkedGoalId && transaction.type === 'transfer') {
    if (transaction.fromAccountId && !transaction.toAccountId) {
      return `${getAccountName(accountsById, transaction.fromAccountId)} to Goal`
    }

    if (transaction.toAccountId && !transaction.fromAccountId) {
      return `Goal to ${getAccountName(accountsById, transaction.toAccountId)}`
    }
  }

  if (transaction.linkedLoanId && transaction.type === 'transfer') {
    const loan = loansById.get(transaction.linkedLoanId)
    const loanLabel =
      loan?.type === 'given'
        ? 'Loan receivable'
        : loan?.type === 'taken'
          ? 'Loan payable'
          : 'Loan'

    if (transaction.fromAccountId && !transaction.toAccountId) {
      return `${getAccountName(
        accountsById,
        transaction.fromAccountId,
      )} to ${loanLabel}`
    }

    if (transaction.toAccountId && !transaction.fromAccountId) {
      return `${loanLabel} to ${getAccountName(
        accountsById,
        transaction.toAccountId,
      )}`
    }
  }

  if (transaction.type === 'income') {
    return `To ${getAccountName(accountsById, transaction.toAccountId)}`
  }

  if (transaction.type === 'expense') {
    return `From ${getAccountName(accountsById, transaction.fromAccountId)}`
  }

  if (transaction.type === 'transfer') {
    return `${getAccountName(
      accountsById,
      transaction.fromAccountId,
    )} to ${getAccountName(accountsById, transaction.toAccountId)}`
  }

  if (transaction.toAccountId) {
    return `${category?.name ?? 'Balance'} adjustment to ${getAccountName(
      accountsById,
      transaction.toAccountId,
    )}`
  }

  return `${category?.name ?? 'Balance'} adjustment from ${getAccountName(
    accountsById,
    transaction.fromAccountId,
  )}`
}

function getTransactionAmountText(
  transaction: Transaction,
  loansById: Map<string, Loan>,
) {
  if (transaction.linkedGoalId && transaction.type === 'transfer') {
    return transaction.fromAccountId
      ? `Saved ${formatPkr(transaction.amount)}`
      : `Withdrew ${formatPkr(transaction.amount)}`
  }

  if (transaction.linkedLoanId && transaction.type === 'transfer') {
    const loan = loansById.get(transaction.linkedLoanId)

    if (loan?.type === 'given') {
      return transaction.fromAccountId
        ? `Lent ${formatPkr(transaction.amount)}`
        : `Received ${formatPkr(transaction.amount)}`
    }

    if (loan?.type === 'taken') {
      return transaction.toAccountId
        ? `Borrowed ${formatPkr(transaction.amount)}`
        : `Paid ${formatPkr(transaction.amount)}`
    }

    return `Loan ${formatPkr(transaction.amount)}`
  }

  if (transaction.type === 'income') {
    return `+${formatPkr(transaction.amount)}`
  }

  if (transaction.type === 'expense') {
    return `-${formatPkr(transaction.amount)}`
  }

  if (transaction.type === 'adjustment') {
    return transaction.toAccountId
      ? `+${formatPkr(transaction.amount)}`
      : `-${formatPkr(transaction.amount)}`
  }

  return formatPkr(transaction.amount)
}

function getTransactionAmountTone(
  transaction: Transaction,
): DashboardRecentTransaction['amountTone'] {
  if (transaction.type === 'income') {
    return 'success'
  }

  if (transaction.type === 'adjustment' && transaction.toAccountId) {
    return 'info'
  }

  return 'default'
}

function getTransactionIconKind(
  transaction: Transaction,
): DashboardRecentTransaction['iconKind'] {
  if (transaction.linkedBillId) {
    return 'bill'
  }

  if (transaction.linkedGoalId) {
    return 'goal'
  }

  if (transaction.linkedLoanId) {
    return 'loan'
  }

  return transaction.type
}

function getTransactionOrigin(
  transaction: Transaction,
): DashboardLinkedOrigin | undefined {
  if (transaction.linkedBillId) {
    return { label: 'Bill', href: '/bills' }
  }

  if (transaction.linkedGoalId) {
    return { label: 'Goal', href: '/goals' }
  }

  if (transaction.linkedLoanId) {
    return { label: 'Loan', href: '/loans' }
  }

  return undefined
}

function getTransactionDateLabel(transaction: Transaction) {
  const displayTime = getTransactionDisplayTime(transaction)

  return displayTime
    ? `${formatDisplayDate(transaction.date)} at ${displayTime}`
    : formatDisplayDate(transaction.date)
}

export function getRecentTransactions(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  loans: Loan[],
  limit = 8,
): DashboardRecentTransaction[] {
  const accountsById = createRecordMap(accounts)
  const categoriesById = createRecordMap(categories)
  const loansById = createRecordMap(loans)

  return [...transactions]
    .sort(
      (first, second) =>
        getTransactionSortTimestamp(second) - getTransactionSortTimestamp(first),
    )
    .slice(0, limit)
    .map((transaction) => {
      const category = transaction.categoryId
        ? categoriesById.get(transaction.categoryId)
        : undefined

      return {
        id: transaction.id,
        title: getTransactionTitle(transaction, categoriesById, loansById),
        subtitle: getTransactionSubtitle(
          transaction,
          accountsById,
          categoriesById,
          loansById,
        ),
        amountText: getTransactionAmountText(transaction, loansById),
        amountTone: getTransactionAmountTone(transaction),
        dateLabel: getTransactionDateLabel(transaction),
        iconKind: getTransactionIconKind(transaction),
        categoryColor: category?.color,
        categoryIcon: category?.icon,
        origin: getTransactionOrigin(transaction),
      }
    })
}

export function getUpcomingBills(bills: Bill[], limit = 5): DashboardUpcomingBill[] {
  return bills
    .filter((bill) => bill.status !== 'paid')
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, limit)
    .map((bill) => ({
      id: bill.id,
      name: bill.name,
      amountText: formatPkr(bill.amount),
      dueDateLabel: formatDisplayDate(bill.dueDate),
      status: bill.status,
      statusLabel: getBillStatusLabel(bill.status),
    }))
}

export function getGoalsSnapshot(goals: Goal[], limit = 5): DashboardGoalSnapshot[] {
  return goals
    .filter((goal) => goal.status === 'active')
    .sort((first, second) => {
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
    .slice(0, limit)
    .map((goal) => {
      const progressPercent =
        goal.targetAmount <= 0
          ? 0
          : Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0)

      return {
        id: goal.id,
        name: goal.name,
        currentAmountText: formatPkr(goal.currentAmount),
        targetAmountText: formatPkr(goal.targetAmount),
        remainingAmountText: formatPkr(remainingAmount),
        progressPercent,
        statusLabel: getGoalStatusLabel(goal.status),
      }
    })
}

export function getDashboardLoanSummary(loans: Loan[]): DashboardLoanSummary {
  const summary = getLoanSummary(loans)

  return {
    totalReceivableText: formatPkr(summary.totalReceivable),
    totalPayableText: formatPkr(summary.totalPayable),
  }
}
