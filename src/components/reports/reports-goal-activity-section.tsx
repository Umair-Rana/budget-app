import { ArrowDownToLine, ArrowUpFromLine, PiggyBank } from 'lucide-react'

import { DetailLine } from '@/components/app/detail-line'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import { ReportAmount } from '@/components/reports/report-amount'
import type {
  ReportGoalActivityRow,
  ReportGoalActivitySummary,
} from '@/data/reports/reports-selectors'
import { cn } from '@/lib/utils'

function goalMovementStyle(
  movement: ReportGoalActivityRow['movementLabel'],
): {
  amount: string
  badgeTone: StatusBadgeTone
  icon: typeof ArrowDownToLine
  iconBox: string
} {
  if (movement === 'Contribution') {
    return {
      amount: 'text-success',
      badgeTone: 'success',
      icon: ArrowDownToLine,
      iconBox: 'bg-success/10 text-success',
    }
  }

  return {
    amount: 'text-foreground',
    badgeTone: 'warning',
    icon: ArrowUpFromLine,
    iconBox: 'bg-warning/10 text-warning',
  }
}

export function ReportsGoalActivitySection({
  rows,
  summary,
}: {
  rows: ReportGoalActivityRow[]
  summary: ReportGoalActivitySummary
}) {
  return (
    <SectionCard
      icon={PiggyBank}
      title="Goal Activity"
      description="Contributions and withdrawals stay separate from normal cashflow."
    >
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Contributions"
            value={<ReportAmount value={summary.totalContributionsText} />}
          />
        </div>
        <div className="rounded-lg border bg-background p-3">
          <DetailLine
            label="Withdrawals"
            value={<ReportAmount value={summary.totalWithdrawalsText} />}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          No goal movements found for this month.
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {(() => {
                    const style = goalMovementStyle(row.movementLabel)
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
                        {row.goalName}
                      </p>
                      <StatusBadge
                        tone={goalMovementStyle(row.movementLabel).badgeTone}
                      >
                        {row.movementLabel}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.accountName} on {row.dateLabel}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    'font-semibold sm:text-right',
                    goalMovementStyle(row.movementLabel).amount,
                  )}
                >
                  <ReportAmount value={row.amountText} />
                </p>
              </div>
              {row.notes ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
