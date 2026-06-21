import {
  Archive,
  ArrowRightLeft,
  CircleDollarSign,
  Pencil,
  ReceiptText,
  Trash2,
} from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { AmountDisplay } from '@/components/app/amount-display'
import { StatusBadge } from '@/components/app/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Account } from '@/data/models/account'
import type { Category } from '@/data/models/category'
import type { RecurringTransaction } from '@/data/models/recurring-transaction'
import { getTransactionTypeLabel } from '@/data/display/transaction-options'
import { formatDisplayDate } from '@/lib/formatting'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type RecurringTransactionCardProps = {
  recurringTransaction: RecurringTransaction
  accountsById: Map<string, Account>
  categoriesById: Map<string, Category>
  onArchive: (recurringTransaction: RecurringTransaction) => void
  onDelete: (recurringTransaction: RecurringTransaction) => void
  onEdit: (recurringTransaction: RecurringTransaction) => void
}

function getAccountName(accountsById: Map<string, Account>, accountId?: string) {
  return accountId ? accountsById.get(accountId)?.name ?? 'Unknown account' : ''
}

function scheduleLabel(recurringTransaction: RecurringTransaction) {
  const frequency =
    recurringTransaction.interval === 1
      ? recurringTransaction.frequency
      : `${recurringTransaction.interval} ${recurringTransaction.frequency}`

  return `Every ${frequency}`
}

function movementLabel(
  recurringTransaction: RecurringTransaction,
  accountsById: Map<string, Account>,
) {
  if (recurringTransaction.type === 'income') {
    return getAccountName(accountsById, recurringTransaction.toAccountId)
  }

  if (recurringTransaction.type === 'expense') {
    return getAccountName(accountsById, recurringTransaction.fromAccountId)
  }

  return `${getAccountName(
    accountsById,
    recurringTransaction.fromAccountId,
  )} -> ${getAccountName(accountsById, recurringTransaction.toAccountId)}`
}

function fallbackIcon(recurringTransaction: RecurringTransaction) {
  if (recurringTransaction.type === 'income') {
    return <CircleDollarSign className="size-5" aria-hidden="true" />
  }

  if (recurringTransaction.type === 'expense') {
    return <ReceiptText className="size-5" aria-hidden="true" />
  }

  return <ArrowRightLeft className="size-5" aria-hidden="true" />
}

export function RecurringTransactionCard({
  accountsById,
  categoriesById,
  onArchive,
  onDelete,
  onEdit,
  recurringTransaction,
}: RecurringTransactionCardProps) {
  const category = recurringTransaction.categoryId
    ? categoriesById.get(recurringTransaction.categoryId)
    : undefined
  const inactive =
    !recurringTransaction.isActive ||
    Boolean(recurringTransaction.archivedAt) ||
    Boolean(recurringTransaction.deletedAt)

  return (
    <Card>
      <CardContent className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
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
              : fallbackIcon(recurringTransaction)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-foreground">
                {recurringTransaction.name}
              </p>
              <StatusBadge
                tone={recurringTransaction.type === 'income' ? 'success' : 'neutral'}
              >
                {getTransactionTypeLabel(recurringTransaction.type)}
              </StatusBadge>
              <StatusBadge tone={inactive ? 'warning' : 'info'}>
                {inactive ? 'Inactive' : 'Active'}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {movementLabel(recurringTransaction, accountsById)}
            </p>
            {recurringTransaction.notes ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {recurringTransaction.notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">
              {scheduleLabel(recurringTransaction)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Next run {formatDisplayDate(recurringTransaction.nextRunDate)}
            </p>
            <p className="mt-1 text-base font-semibold">
              <AmountDisplay
                value={recurringTransaction.amount}
                tone={
                  recurringTransaction.type === 'income' ? 'success' : 'default'
                }
              />
            </p>
          </div>

          <ActionMenu
            label={`Open actions for ${recurringTransaction.name}`}
            items={[
              {
                icon: Pencil,
                label: 'Edit',
                onSelect: () => onEdit(recurringTransaction),
              },
              {
                disabled: inactive,
                icon: Archive,
                label: 'Archive',
                onSelect: () => onArchive(recurringTransaction),
              },
              {
                icon: Trash2,
                label: 'Delete',
                onSelect: () => onDelete(recurringTransaction),
                separatorBefore: true,
                variant: 'destructive',
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}
