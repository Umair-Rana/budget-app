import {
  Banknote,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  ReceiptText,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ReportAmount } from '@/components/reports/report-amount'
import type { ReportSummaryMetric } from '@/data/reports/reports-selectors'
import { cn } from '@/lib/utils'

const summaryIcons: Record<string, LucideIcon> = {
  'bills-paid': ReceiptText,
  'budget-remaining': WalletCards,
  expenses: ReceiptText,
  'goal-contributions': PiggyBank,
  income: Banknote,
  'loan-payments': Landmark,
  'net-cashflow': ChartNoAxesColumnIncreasing,
}

function metricToneClassName(metric: ReportSummaryMetric) {
  if (metric.tone === 'success') {
    return {
      card: 'border-success/25',
      icon: 'bg-success/10 text-success',
    }
  }

  if (metric.tone === 'warning') {
    return {
      card: 'border-warning/35',
      icon: 'bg-warning/10 text-warning',
    }
  }

  if (metric.tone === 'info') {
    return {
      card: 'border-info/25',
      icon: 'bg-info/10 text-info',
    }
  }

  return {
    card: undefined,
    icon: 'bg-primary/10 text-primary',
  }
}

function PrimaryMetricCard({ metric }: { metric: ReportSummaryMetric }) {
  const Icon = summaryIcons[metric.key] ?? CircleDollarSign
  const tone = metricToneClassName(metric)
  const emphasized =
    metric.key === 'net-cashflow' || metric.key === 'budget-remaining'

  return (
    <Card className={cn('overflow-hidden', tone.card, emphasized && 'shadow-sm')}>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm">{metric.label}</CardTitle>
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-lg',
            tone.icon,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p
          className={cn(
            'text-2xl font-semibold tracking-normal text-foreground',
            emphasized && 'text-3xl',
          )}
        >
          <ReportAmount value={metric.value} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{metric.helper}</p>
      </CardContent>
    </Card>
  )
}

function SecondaryMetricTile({ metric }: { metric: ReportSummaryMetric }) {
  const Icon = summaryIcons[metric.key] ?? CircleDollarSign

  return (
    <div className="rounded-lg border bg-card/60 p-3 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            <ReportAmount value={metric.value} />
          </p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{metric.helper}</p>
    </div>
  )
}

export function ReportsSummaryCards({
  primaryMetrics,
  secondaryMetrics,
}: {
  primaryMetrics: ReportSummaryMetric[]
  secondaryMetrics: ReportSummaryMetric[]
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <PrimaryMetricCard key={metric.key} metric={metric} />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {secondaryMetrics.map((metric) => (
          <SecondaryMetricTile key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  )
}
