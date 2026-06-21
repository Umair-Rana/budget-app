import { CheckCircle2, HandCoins, Landmark, WalletCards } from 'lucide-react'

import { SummaryStatCard } from '@/components/app/summary-stat-card'
import type { LoanSummary } from '@/data/domain/loan-calculations'
import { formatPkr } from '@/lib/formatting'

export function LoanSummaryCards({ summary }: { summary: LoanSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryStatCard
        icon={HandCoins}
        label="Total receivable"
        value={formatPkr(summary.totalReceivable)}
        tone="info"
      />
      <SummaryStatCard
        icon={WalletCards}
        label="Total payable"
        value={formatPkr(summary.totalPayable)}
        tone="warning"
      />
      <SummaryStatCard
        icon={Landmark}
        label="Active loans"
        value={String(summary.activeLoans)}
      />
      <SummaryStatCard
        icon={CheckCircle2}
        label="Completed loans"
        value={String(summary.completedLoans)}
        tone="success"
      />
    </div>
  )
}
