import { TriangleAlert } from 'lucide-react'

import { DetailLine } from '@/components/app/detail-line'
import { ProgressRow, type ProgressRowTone } from '@/components/app/progress-row'
import { SectionCard } from '@/components/app/section-card'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import { ReportAmount } from '@/components/reports/report-amount'
import type {
  BudgetUsageStatus,
  ReportBudgetRow,
  ReportUnplannedBudgetRow,
} from '@/data/reports/reports-selectors'
import { renderIconByName } from '@/lib/icon-map'

function statusTone(status: BudgetUsageStatus): StatusBadgeTone {
  if (status === 'safe') {
    return 'success'
  }

  if (status === 'near-limit') {
    return 'warning'
  }

  if (status === 'over-budget') {
    return 'danger'
  }

  return 'info'
}

function progressTone(status: BudgetUsageStatus): ProgressRowTone {
  if (status === 'over-budget') {
    return 'danger'
  }

  if (status === 'near-limit') {
    return 'warning'
  }

  return 'success'
}

export function ReportsBudgetSection({
  budgetFallback,
  plannedRows,
  unplannedRows,
}: {
  budgetFallback: boolean
  plannedRows: ReportBudgetRow[]
  unplannedRows: ReportUnplannedBudgetRow[]
}) {
  const hasRows = plannedRows.length > 0 || unplannedRows.length > 0

  return (
    <SectionCard
      title="Budget vs Actual"
      description={
        budgetFallback
          ? 'No budget planned for this month. Showing actual spending where available.'
          : 'Planner allocations compared with real expense transactions.'
      }
    >
      {!hasRows ? (
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          No budget or category spending found for this month.
        </div>
      ) : (
        <div className="grid gap-4">
          {plannedRows.length > 0 ? (
            <div className="grid gap-2">
              {plannedRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: row.categoryColor }}
                      >
                        {renderIconByName(row.categoryIcon, 'size-4')}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {row.categoryName}
                        </p>
                        <StatusBadge
                          className="mt-1"
                          tone={statusTone(row.status)}
                        >
                          {row.statusLabel}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-96">
                      <DetailLine
                        label="Planned"
                        value={<ReportAmount value={row.plannedAmountText} />}
                      />
                      <DetailLine
                        label="Actual"
                        value={<ReportAmount value={row.actualAmountText} />}
                      />
                      <DetailLine
                        label="Remaining"
                        value={<ReportAmount value={row.remainingAmountText} />}
                      />
                    </div>
                  </div>
                  <ProgressRow
                    className="mt-3"
                    label="Usage"
                    percent={row.progressPercent}
                    percentLabel={`${row.usagePercent}%`}
                    tone={progressTone(row.status)}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {unplannedRows.length > 0 ? (
            <section className="grid gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Unplanned Spending
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Categories with expenses but no planned budget.
                </p>
              </div>
              <div className="grid gap-2">
                {unplannedRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 transition-colors hover:bg-warning/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: row.categoryColor }}
                      >
                        {renderIconByName(row.categoryIcon, 'size-4')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-foreground">
                            {row.categoryName}
                          </p>
                          <StatusBadge className="gap-1" tone="warning">
                            <TriangleAlert
                              className="size-3"
                              aria-hidden="true"
                            />
                            Unplanned
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Spending found without a planned budget.
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      <ReportAmount value={row.actualAmountText} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </SectionCard>
  )
}
