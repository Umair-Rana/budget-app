import { ProgressRow } from '@/components/app/progress-row'
import { SectionCard } from '@/components/app/section-card'
import { ReportAmount } from '@/components/reports/report-amount'
import type { ReportCashflowBar } from '@/data/reports/reports-selectors'

export function ReportsCashflowChart({
  bars,
}: {
  bars: ReportCashflowBar[]
}) {
  return (
    <SectionCard
      title="Income vs Expenses"
      description="Normal cashflow for the selected month."
      contentClassName="grid gap-4"
    >
      {bars.map((bar) => (
        <ProgressRow
          key={bar.label}
          label={bar.label}
          percent={bar.progressPercent}
          tone={bar.tone === 'success' ? 'success' : 'warning'}
          value={<ReportAmount value={bar.valueText} />}
        />
      ))}
    </SectionCard>
  )
}
