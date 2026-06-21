import { CircleDollarSign, PiggyBank, ReceiptText, Wallet } from 'lucide-react'

import { SummaryStatCard } from '@/components/app/summary-stat-card'
import type { OverviewDashboardMetric } from '@/data/dashboard/dashboard-summary'

const metricConfig = {
  balance: {
    icon: Wallet,
    tone: 'default',
  },
  income: {
    icon: CircleDollarSign,
    tone: 'success',
  },
  expense: {
    icon: ReceiptText,
    tone: 'warning',
  },
  remaining: {
    icon: PiggyBank,
    tone: 'info',
  },
} as const

export function OverviewMetricCards({
  metrics,
}: {
  metrics: OverviewDashboardMetric[]
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const config = metricConfig[metric.tone]

        return (
          <SummaryStatCard
            key={metric.label}
            helper={metric.helper}
            icon={config.icon}
            label={metric.label}
            tone={config.tone}
            value={metric.value}
          />
        )
      })}
    </div>
  )
}
