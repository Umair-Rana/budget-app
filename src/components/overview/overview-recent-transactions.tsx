import {
  ArrowRightLeft,
  CircleDollarSign,
  HandCoins,
  Landmark,
  PencilRuler,
  ReceiptText,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardRecentTransaction } from '@/data/dashboard/dashboard-selectors'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

function TransactionFallbackIcon({
  iconKind,
}: {
  iconKind: DashboardRecentTransaction['iconKind']
}) {
  if (iconKind === 'income') {
    return <CircleDollarSign className="size-4" aria-hidden="true" />
  }

  if (iconKind === 'expense' || iconKind === 'bill') {
    return <ReceiptText className="size-4" aria-hidden="true" />
  }

  if (iconKind === 'adjustment') {
    return <PencilRuler className="size-4" aria-hidden="true" />
  }

  if (iconKind === 'goal') {
    return <Target className="size-4" aria-hidden="true" />
  }

  if (iconKind === 'loan') {
    return <Landmark className="size-4" aria-hidden="true" />
  }

  return <ArrowRightLeft className="size-4" aria-hidden="true" />
}

function iconTone(item: DashboardRecentTransaction) {
  if (item.iconKind === 'income') {
    return 'bg-success/10 text-success'
  }

  if (item.iconKind === 'expense' || item.iconKind === 'bill') {
    return 'bg-warning/10 text-warning'
  }

  if (item.iconKind === 'goal' || item.iconKind === 'loan') {
    return 'bg-info/10 text-info'
  }

  return 'bg-muted text-muted-foreground'
}

function amountClassName(item: DashboardRecentTransaction) {
  if (item.amountTone === 'success') {
    return 'text-success'
  }

  if (item.amountTone === 'info') {
    return 'text-info'
  }

  return 'text-foreground'
}

export function OverviewRecentTransactions({
  transactions,
}: {
  transactions: DashboardRecentTransaction[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Recent Transactions</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest active transactions saved locally.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                    transaction.categoryColor ? 'text-white' : iconTone(transaction),
                  )}
                  style={
                    transaction.categoryColor
                      ? { backgroundColor: transaction.categoryColor }
                      : undefined
                  }
                >
                  {transaction.categoryIcon ? (
                    renderIconByName(transaction.categoryIcon, 'size-4')
                  ) : (
                    <TransactionFallbackIcon iconKind={transaction.iconKind} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {transaction.title}
                    </p>
                    {transaction.origin ? (
                      <StatusBadge tone="info">
                        <Link to={transaction.origin.href}>
                          {transaction.origin.label}
                        </Link>
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {transaction.subtitle} | {transaction.dateLabel}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  'shrink-0 text-sm font-semibold',
                  amountClassName(transaction),
                )}
              >
                {transaction.amountText}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HandCoins className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              No transactions yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first transaction to start building the overview.
            </p>
            <Button asChild className="mt-4">
              <Link to="/transactions">Open Transactions</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
