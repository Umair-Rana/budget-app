import { Landmark, Plus, ReceiptText, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function OverviewQuickActions({
  disabled,
  onAddBill,
  onAddGoal,
  onAddLoan,
  onAddTransaction,
}: {
  disabled?: boolean
  onAddBill: () => void
  onAddGoal: () => void
  onAddLoan: () => void
  onAddTransaction: () => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Quick Actions</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the existing add dialogs from the dashboard.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button type="button" onClick={onAddTransaction} disabled={disabled}>
          <Plus className="size-4" aria-hidden="true" />
          Add Transaction
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddBill}
          disabled={disabled}
        >
          <ReceiptText className="size-4" aria-hidden="true" />
          Add Bill
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddGoal}
          disabled={disabled}
        >
          <Target className="size-4" aria-hidden="true" />
          Add Goal
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddLoan}
          disabled={disabled}
        >
          <Landmark className="size-4" aria-hidden="true" />
          Add Loan
        </Button>
      </CardContent>
    </Card>
  )
}
