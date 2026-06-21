import { ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/app/section-card'
import { ReportAmount } from '@/components/reports/report-amount'
import { Button } from '@/components/ui/button'
import type { ReportBillPaidRow } from '@/data/reports/reports-selectors'

export function ReportsBillsPaidSection({
  rows,
}: {
  rows: ReportBillPaidRow[]
}) {
  return (
    <SectionCard
      icon={ReceiptText}
      title="Bills Paid"
      description="Paid bill transactions counted once from their linked expense."
    >
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                No bills paid this month.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                View your upcoming bills to log or mark payments.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/bills">Go to Bills</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-medium text-foreground">{row.billName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.categoryName} from {row.paymentAccountName}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-semibold text-foreground">
                  <ReportAmount value={row.amountText} />
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.paidDateLabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
