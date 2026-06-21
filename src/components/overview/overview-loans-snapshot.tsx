import { Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DetailLine } from '@/components/app/detail-line'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardLoanSummary } from '@/data/dashboard/dashboard-selectors'

export function OverviewLoansSnapshot({
  loanSummary,
}: {
  loanSummary: DashboardLoanSummary
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Loans Snapshot</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Outstanding amounts from tracked loans.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-lg border bg-background p-3">
            <DetailLine
              label="Total Receivable"
              value={loanSummary.totalReceivableText}
              valueSize="xl"
            />
          </div>
          <div className="rounded-lg border bg-background p-3">
            <DetailLine
              label="Total Payable"
              value={loanSummary.totalPayableText}
              valueSize="xl"
            />
          </div>
        </div>

        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/loans">
            <Landmark className="size-4" aria-hidden="true" />
            Open Loans
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
