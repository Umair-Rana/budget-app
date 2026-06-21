import {
  ChartNoAxesColumnIncreasing,
  ReceiptText,
  TriangleAlert,
  WalletCards,
} from 'lucide-react'

import { SummaryStatCard } from '@/components/app/summary-stat-card'
import type { PlannerSummary } from '@/data/planner/planner-selectors'

export function PlannerSummaryCards({ summary }: { summary: PlannerSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryStatCard
        icon={WalletCards}
        label="Planned Budget Total"
        value={summary.plannedTotalText}
        helper="Active category allocations"
        tone="info"
      />
      <SummaryStatCard
        icon={ReceiptText}
        label="Actual Spending"
        value={summary.actualTotalText}
        helper="Expense transactions this month"
        tone="default"
      />
      <SummaryStatCard
        icon={ChartNoAxesColumnIncreasing}
        label="Remaining Budget"
        value={summary.remainingTotalText}
        helper="Planned minus actual"
        tone={summary.remainingTotal < 0 ? 'warning' : 'success'}
      />
      <SummaryStatCard
        icon={TriangleAlert}
        label="Over-Budget Categories"
        value={summary.overBudgetCountText}
        helper="Allocations above plan"
        tone={summary.overBudgetCount > 0 ? 'warning' : 'default'}
      />
    </div>
  )
}
