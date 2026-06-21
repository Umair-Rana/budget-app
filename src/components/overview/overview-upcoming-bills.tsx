import { ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardUpcomingBill } from '@/data/dashboard/dashboard-selectors'

function statusVariant(status: DashboardUpcomingBill['status']): StatusBadgeTone {
  if (status === 'overdue') {
    return 'warning'
  }

  if (status === 'pending') {
    return 'warning'
  }

  return 'neutral'
}

export function OverviewUpcomingBills({
  bills,
}: {
  bills: DashboardUpcomingBill[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Upcoming Bills</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Next unpaid bills by due date.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {bill.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Due {bill.dueDateLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground">
                  {bill.amountText}
                </p>
                <StatusBadge className="mt-1" tone={statusVariant(bill.status)}>
                  {bill.statusLabel}
                </StatusBadge>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
            <ReceiptText
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              No unpaid bills.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bills you add will appear here until they are paid.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/bills">Open Bills</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
