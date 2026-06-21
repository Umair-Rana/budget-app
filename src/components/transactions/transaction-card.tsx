import {
  Archive,
  ArrowRightLeft,
  CircleDollarSign,
  MoreHorizontal,
  Pencil,
  PencilRuler,
  ReceiptText,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLinkedTransaction } from '@/data/domain/linked-transaction'
import { getTransactionDisplayTime } from '@/data/domain/transaction-datetime'
import type { Account } from '@/data/models/account'
import type { Category } from '@/data/models/category'
import type { Loan } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import { getTransactionTypeLabel } from '@/data/display/transaction-options'
import { formatDisplayDate, formatPkr } from '@/lib/formatting'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type TransactionCardProps = {
  transaction: Transaction
  accountsById: Map<string, Account>
  categoriesById: Map<string, Category>
  loansById?: Map<string, Loan>
  onArchive: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
}

function fallbackAccountName(accountId: string | undefined) {
  return accountId ? 'Unknown account' : 'No account'
}

function getAccountName(accountsById: Map<string, Account>, accountId?: string) {
  return accountId
    ? accountsById.get(accountId)?.name ?? fallbackAccountName(accountId)
    : fallbackAccountName(accountId)
}

function transactionMovement(
  transaction: Transaction,
  accountsById: Map<string, Account>,
  category?: Category,
  loan?: Loan,
) {
  if (transaction.linkedGoalId && transaction.type === 'transfer') {
    if (transaction.fromAccountId && !transaction.toAccountId) {
      return `${getAccountName(accountsById, transaction.fromAccountId)} -> Goal`
    }

    if (transaction.toAccountId && !transaction.fromAccountId) {
      return `Goal -> ${getAccountName(accountsById, transaction.toAccountId)}`
    }
  }

  if (transaction.linkedLoanId && transaction.type === 'transfer') {
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
      )} -> ${loanLabel}`
    }

    if (transaction.toAccountId && !transaction.fromAccountId) {
      return `${loanLabel} -> ${getAccountName(
        accountsById,
        transaction.toAccountId,
      )}`
    }
  }

  if (transaction.type === 'income') {
    return getAccountName(accountsById, transaction.toAccountId)
  }

  if (transaction.type === 'expense') {
    return getAccountName(accountsById, transaction.fromAccountId)
  }

  if (transaction.type === 'transfer') {
    return `${getAccountName(
      accountsById,
      transaction.fromAccountId,
    )} -> ${getAccountName(accountsById, transaction.toAccountId)}`
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

function transactionAmount(transaction: Transaction, loan?: Loan) {
  if (transaction.linkedGoalId && transaction.type === 'transfer') {
    return transaction.fromAccountId
      ? `Saved ${formatPkr(transaction.amount)}`
      : `Withdrew ${formatPkr(transaction.amount)}`
  }

  if (transaction.linkedLoanId && transaction.type === 'transfer') {
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

  return `-> ${formatPkr(transaction.amount)}`
}

function amountClassName(transaction: Transaction) {
  if (transaction.type === 'income') {
    return 'text-success'
  }

  if (transaction.type === 'adjustment' && transaction.toAccountId) {
    return 'text-info'
  }

  return 'text-foreground'
}

function typeIconFallback(transaction: Transaction) {
  if (transaction.type === 'income') {
    return <CircleDollarSign className="size-5" aria-hidden="true" />
  }

  if (transaction.type === 'expense') {
    return <ReceiptText className="size-5" aria-hidden="true" />
  }

  if (transaction.type === 'transfer') {
    return <ArrowRightLeft className="size-5" aria-hidden="true" />
  }

  return <PencilRuler className="size-5" aria-hidden="true" />
}

function badgeVariant(transaction: Transaction): StatusBadgeTone {
  if (transaction.type === 'income') {
    return 'success'
  }

  if (transaction.type === 'adjustment') {
    return 'info'
  }

  return 'neutral'
}

function linkedSourceName(transaction: Transaction) {
  if (transaction.linkedBillId) {
    return 'Bills'
  }

  if (transaction.linkedGoalId) {
    return 'Goals'
  }

  if (transaction.linkedLoanId) {
    return 'Loans'
  }

  return 'Transactions'
}

function linkedSourcePath(transaction: Transaction) {
  if (transaction.linkedBillId) {
    return '/bills'
  }

  if (transaction.linkedGoalId) {
    return '/goals'
  }

  if (transaction.linkedLoanId) {
    return '/loans'
  }

  return '/transactions'
}

export function TransactionCard({
  accountsById,
  categoriesById,
  loansById,
  onArchive,
  onDelete,
  onEdit,
  transaction,
}: TransactionCardProps) {
  const category = transaction.categoryId
    ? categoriesById.get(transaction.categoryId)
    : undefined
  const loan = transaction.linkedLoanId
    ? loansById?.get(transaction.linkedLoanId)
    : undefined
  const linked = isLinkedTransaction(transaction)
  const linkedSource = linkedSourceName(transaction)
  const displayTime = getTransactionDisplayTime(transaction)
  const title =
    transaction.linkedLoanId && transaction.type === 'transfer'
      ? loan?.type === 'given'
        ? transaction.fromAccountId
          ? 'Loan Given'
          : 'Loan Repayment Received'
        : loan?.type === 'taken'
          ? transaction.toAccountId
            ? 'Loan Taken'
            : 'Loan Repayment Made'
          : 'Loan Movement'
      : transaction.linkedGoalId && transaction.type === 'transfer'
      ? transaction.fromAccountId
        ? 'Goal Contribution'
        : 'Goal Withdrawal'
      : transaction.type === 'adjustment'
      ? 'Balance Adjustment'
      : category?.name ?? getTransactionTypeLabel(transaction.type)

  return (
    <div className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
            !category && 'bg-muted text-muted-foreground',
          )}
          style={category ? { backgroundColor: category.color } : undefined}
        >
          {category
            ? renderIconByName(category.icon, 'size-5')
            : typeIconFallback(transaction)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">
              {title}
            </p>
            <StatusBadge tone={badgeVariant(transaction)}>
              {getTransactionTypeLabel(transaction.type)}
            </StatusBadge>
            {transaction.linkedBillId ? (
              <StatusBadge tone="info">Bill payment</StatusBadge>
            ) : null}
            {transaction.linkedGoalId ? (
              <StatusBadge tone="info">Goal movement</StatusBadge>
            ) : null}
            {transaction.linkedLoanId ? (
              <StatusBadge tone="info">Loan movement</StatusBadge>
            ) : null}
            {linked ? (
              <StatusBadge tone="neutral">Managed in {linkedSource}</StatusBadge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactionMovement(transaction, accountsById, category, loan)}
          </p>
          {linked ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Read-only here. Manage this transaction from {linkedSource}.
            </p>
          ) : null}
          {transaction.notes ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {transaction.notes}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-sm text-muted-foreground">
            {displayTime
              ? `${formatDisplayDate(transaction.date)} at ${displayTime}`
              : formatDisplayDate(transaction.date)}
          </p>
          <p
            className={cn(
              'mt-1 text-base font-semibold',
              amountClassName(transaction),
            )}
          >
            {transactionAmount(transaction, loan)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Open actions for ${category?.name ?? transaction.type}`}
              aria-haspopup="menu"
              title={`Open actions for ${category?.name ?? transaction.type}`}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6}>
            {linked ? (
              <DropdownMenuItem asChild>
                <Link
                  to={linkedSourcePath(transaction)}
                  aria-label={`Open ${linkedSource} to manage this linked transaction`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Manage from {linkedSource}
                </Link>
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => onEdit(transaction)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onArchive(transaction)}>
                  <Archive className="size-4" aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  aria-label="Delete transaction (destructive action)"
                  onSelect={() => onDelete(transaction)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
