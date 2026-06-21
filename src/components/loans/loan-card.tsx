import {
  Archive,
  HandCoins,
  Landmark,
  Pencil,
  Trash2,
} from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { DetailLine } from '@/components/app/detail-line'
import { ProgressRow } from '@/components/app/progress-row'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getLoanAmountRepaid,
  getLoanCurrentStatus,
  getLoanProgressPercent,
} from '@/data/domain/loan-calculations'
import {
  getLoanStatusLabel,
  getLoanTypeLabel,
} from '@/data/display/loan-options'
import type { Account } from '@/data/models/account'
import type { Loan } from '@/data/models/loan'
import { formatDisplayDate } from '@/lib/formatting'
import { cn } from '@/lib/utils'

type LoanCardProps = {
  loan: Loan
  accountsById: Map<string, Account>
  onArchive: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onEdit: (loan: Loan) => void
  onRecordPayment: (loan: Loan) => void
}

function statusVariant(loan: Loan): StatusBadgeTone {
  const status = getLoanCurrentStatus(loan)

  if (status === 'completed') {
    return 'success'
  }

  if (status === 'overdue') {
    return 'warning'
  }

  if (status === 'partially_paid') {
    return 'info'
  }

  return 'neutral'
}

function cardClassName(loan: Loan) {
  const status = getLoanCurrentStatus(loan)

  if (status === 'completed') {
    return 'border-success/25'
  }

  if (status === 'overdue') {
    return 'border-warning/45'
  }

  return loan.type === 'given' ? 'border-info/20' : 'border-warning/20'
}

function accountName(accountsById: Map<string, Account>, accountId?: string) {
  if (!accountId) {
    return 'No account'
  }

  return accountsById.get(accountId)?.name ?? 'Unknown account'
}

export function LoanCard({
  accountsById,
  loan,
  onArchive,
  onDelete,
  onEdit,
  onRecordPayment,
}: LoanCardProps) {
  const status = getLoanCurrentStatus(loan)
  const amountRepaid = getLoanAmountRepaid(loan)
  const progress = getLoanProgressPercent(loan)
  const sourceAccount =
    loan.type === 'given'
      ? accountName(accountsById, loan.sourceAccountId)
      : accountName(accountsById, loan.receivingAccountId)
  const canRecordPayment = status !== 'completed'

  return (
    <Card className={cn('overflow-hidden', cardClassName(loan))}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg shadow-sm',
              loan.type === 'given'
                ? 'bg-info/10 text-info'
                : 'bg-warning/10 text-warning',
            )}
          >
            <Landmark className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{loan.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {loan.counterparty ?? 'No counterparty'} | {sourceAccount}
            </p>
          </div>
        </div>

        <ActionMenu
          label={`Open actions for ${loan.name}`}
          items={[
            {
              disabled: !canRecordPayment,
              icon: HandCoins,
              label:
                loan.type === 'given' ? 'Record Repayment' : 'Record Payment',
              onSelect: () => onRecordPayment(loan),
            },
            {
              icon: Pencil,
              label: 'Edit',
              onSelect: () => onEdit(loan),
            },
            {
              icon: Archive,
              label: 'Archive',
              onSelect: () => onArchive(loan),
            },
            {
              icon: Trash2,
              label: 'Delete',
              onSelect: () => onDelete(loan),
              separatorBefore: true,
              variant: 'destructive',
            },
          ]}
        />
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={loan.type === 'given' ? 'info' : 'warning'}>
            {getLoanTypeLabel(loan.type)}
          </StatusBadge>
          <StatusBadge tone={statusVariant(loan)}>
            {getLoanStatusLabel(status)}
          </StatusBadge>
          {loan.interestRate !== undefined ? (
            <StatusBadge tone="outline">{loan.interestRate}% interest</StatusBadge>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DetailLine
            label="Principal"
            amount={loan.principalAmount}
            valueSize="xl"
          />
          <DetailLine
            label="Outstanding"
            amount={loan.outstandingAmount}
            valueSize="xl"
          />
          <DetailLine label="Repaid" amount={amountRepaid} valueSize="xl" />
        </div>

        <ProgressRow
          className="mt-5"
          label="Repayment progress"
          percent={progress}
        />

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            Due {loan.dueDate ? formatDisplayDate(loan.dueDate) : 'not set'}
          </span>
        </div>

        {loan.notes ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {loan.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
