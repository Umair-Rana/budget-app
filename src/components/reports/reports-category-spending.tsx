import { ProgressRow } from '@/components/app/progress-row'
import { SectionCard } from '@/components/app/section-card'
import { ReportAmount } from '@/components/reports/report-amount'
import type {
  ReportCategorySpendingChartRow,
  ReportCategorySpendingRow,
} from '@/data/reports/reports-selectors'
import { renderIconByName } from '@/lib/icon-map'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

type CategoryTooltipPayload = {
  payload: ReportCategorySpendingChartRow
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly CategoryTooltipPayload[]
}) {
  const row = payload?.[0]?.payload

  if (!active || !row) {
    return null
  }

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{row.name}</p>
      <p className="mt-1 text-muted-foreground">
        {row.amountText} - {row.percentText}
      </p>
    </div>
  )
}

export function ReportsCategorySpending({
  chartRows,
  rows,
}: {
  chartRows: ReportCategorySpendingChartRow[]
  rows: ReportCategorySpendingRow[]
}) {
  return (
    <SectionCard
      title="Category Spending"
      description="Expense transactions grouped by category."
    >
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          No expense spending found for this month.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.85fr)_1.15fr] lg:items-center">
          <div className="min-h-64">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartRows}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  {chartRows.map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <CategoryTooltip
                      active={props.active}
                      payload={
                        props.payload as
                          | readonly CategoryTooltipPayload[]
                          | undefined
                      }
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                key={row.categoryId}
                className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: row.categoryColor }}
                    >
                      {renderIconByName(row.categoryIcon, 'size-4')}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.categoryName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expense share
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    <ReportAmount value={row.amountText} />
                  </p>
                </div>
                <ProgressRow
                  className="mt-2"
                  label="Share"
                  percent={row.progressPercent}
                  value={row.percentText}
                  fillStyle={{ backgroundColor: row.categoryColor }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
