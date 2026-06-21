import {
  Archive,
  CheckCircle2,
  Pencil,
  Receipt,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { DetailLine } from '@/components/app/detail-line'
import { MetaRow } from '@/components/app/meta-row'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getBillFrequencyLabel,
  getBillStatusLabel,
} from '@/data/display/bill-options'
import type { Account } from '@/data/models/account'
import type { Bill } from '@/data/models/bill'
import type { Category } from '@/data/models/category'
import { formatDisplayDate } from '@/lib/formatting'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type BillCardProps = {
  bill: Bill
  accountsById: Map<string, Account>
  categoriesById: Map<string, Category>
  onArchive: (bill: Bill) => void
  onDelete: (bill: Bill) => void
  onEdit: (bill: Bill) => void
  onMarkPaid: (bill: Bill) => void
  onMarkUnpaid: (bill: Bill) => void
}

function daysFromToday(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`)
  const dayMs = 24 * 60 * 60 * 1000

  return Math.floor((target.getTime() - today.getTime()) / dayMs)
}

function statusVariant(bill: Bill): StatusBadgeTone {
  if (bill.status === 'paid') {
    return 'success'
  }

  if (bill.status === 'overdue') {
    return 'warning'
  }

  if (daysFromToday(bill.dueDate) <= 2) {
    return 'warning'
  }

  return 'neutral'
}

function cardClassName(bill: Bill) {
  if (bill.status === 'paid') {
    return 'border-success/25'
  }

  if (bill.status === 'overdue') {
    return 'border-warning/45'
  }

  if (daysFromToday(bill.dueDate) <= 2) {
    return 'border-warning/45'
  }

  return undefined
}

export function BillCard({
  accountsById,
  bill,
  categoriesById,
  onArchive,
  onDelete,
  onEdit,
  onMarkPaid,
  onMarkUnpaid,
}: BillCardProps) {
  const category = categoriesById.get(bill.categoryId)
  const paymentAccount = bill.paymentAccountId
    ? accountsById.get(bill.paymentAccountId)
    : undefined
  const isPaid = bill.status === 'paid'

  return (
    <Card className={cn('overflow-hidden', cardClassName(bill))}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
              !category && 'bg-muted text-muted-foreground',
            )}
            style={category ? { backgroundColor: category.color } : undefined}
          >
            {category ? renderIconByName(category.icon, 'size-5') : <Receipt className="size-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{bill.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {category?.name ?? 'Expense category'}
            </p>
          </div>
        </div>

        <ActionMenu
          label={`Open actions for ${bill.name}`}
          items={[
            {
              icon: Pencil,
              label: 'Edit',
              onSelect: () => onEdit(bill),
            },
            isPaid
              ? {
                  icon: RotateCcw,
                  label: 'Mark Unpaid',
                  onSelect: () => onMarkUnpaid(bill),
                }
              : {
                  icon: CheckCircle2,
                  label: 'Mark Paid',
                  onSelect: () => onMarkPaid(bill),
                },
            {
              icon: Archive,
              label: 'Archive',
              onSelect: () => onArchive(bill),
            },
            {
              icon: Trash2,
              label: 'Delete',
              onSelect: () => onDelete(bill),
              separatorBefore: true,
              variant: 'destructive',
            },
          ]}
        />
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusVariant(bill)}>
            {getBillStatusLabel(bill.status)}
          </StatusBadge>
          <StatusBadge tone="outline">
            {getBillFrequencyLabel(bill.frequency)}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailLine label="Amount" amount={bill.amount} valueSize="xl" />
          <DetailLine
            label="Due Date"
            value={formatDisplayDate(bill.dueDate)}
            valueSize="large"
          />
        </div>

        {paymentAccount ? (
          <MetaRow className="mt-4" label="Paid from">
            {paymentAccount.name}
          </MetaRow>
        ) : null}

        {bill.notes ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {bill.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
