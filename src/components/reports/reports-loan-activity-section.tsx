import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
} from 'lucide-react'

import { DetailLine } from '@/components/app/detail-line'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import { ReportAmount } from '@/components/reports/report-amount'
import type {
  ReportLoanActivityRow,
  ReportLoanActivitySummary,
} from '@/data/reports/reports-selectors'
import { cn } from '@/lib/utils'

function movementVariant(
  movement: ReportLoanActivityRow['movementLabel'],
): StatusBadgeTone {
  if (movement === 'Repayment Received' || movement === 'Loan Taken') {
    return 'success'
  }

  if (movement === 'Repayment Made') {
    return 'warning'
  }

  return 'neutral'
}

function loanMovementStyle(movement: ReportLoanActivityRow['movementLabel']) {
  if (movement === 'Repayment Received' || movement === 'Loan Taken') {
    return {
      amount: 'text-success',
      icon: ArrowDownToLine,
      iconBox: 'bg-success/10 text-success',
    }
  }

  if (movement === 'Repayment Made') {
    return {
      amount: 'text-foreground',
      icon: ArrowUpFromLine,
      iconBox: 'bg-warning/10 text-warning',
    }
  }

  return {
    amount: 'text-foreground',
    icon: ArrowUpFromLine,
    iconBox: 'bg-muted text-muted-foreground',
  }
}

export function ReportsLoanActivitySection({
  rows,
  summary,
}: {
  rows: ReportLoanActivityRow[]
  summary: ReportLoanActivitySummary
}) {
  return (
    <SectionCard
      icon={Landmark}
      title="Loan Activity"
      description="Loan disbursements and repayments stay outside normal cashflow."
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Repayments Received"
            value={<ReportAmount value={summary.totalRepaymentsReceivedText} />}
          />
        </div>
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Repayments Made"
            value={<ReportAmount value={summary.totalRepaymentsMadeText} />}
          />
        </div>
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Loan Given"
            value={<ReportAmount value={summary.totalLoanGivenText} />}
          />
        </div>
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Loan Taken"
            value={<ReportAmount value={summary.totalLoanTakenText} />}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          No loan movements found for this month.
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-start"
            >
              <div className="flex min-w-0 items-start gap-3">
                {(() => {
                  const style = loanMovementStyle(row.movementLabel)
                  const Icon = style.icon

                  return (
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        style.iconBox,
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                  )
                })()}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {row.loanName}
                    </p>
                    <StatusBadge tone="outline">{row.loanTypeLabel}</StatusBadge>
                    <StatusBadge tone={movementVariant(row.movementLabel)}>
                      {row.movementLabel}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.accountName} on {row.dateLabel}
                  </p>
                  {row.counterparty ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Counterparty: {row.counterparty}
                    </p>
                  ) : null}
                </div>
              </div>
              <p
                className={cn(
                  'font-semibold sm:text-right',
                  loanMovementStyle(row.movementLabel).amount,
                )}
              >
                <ReportAmount value={row.amountText} />
              </p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
