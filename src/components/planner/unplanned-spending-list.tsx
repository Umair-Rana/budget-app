import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PlannerUnplannedSpendingRow } from '@/data/planner/planner-selectors'
import { renderIconByName } from '@/lib/icon-map'

type UnplannedSpendingListProps = {
  rows: PlannerUnplannedSpendingRow[]
  onAddBudget: (categoryId: string) => void
}

export function UnplannedSpendingList({
  onAddBudget,
  rows,
}: UnplannedSpendingListProps) {
  if (rows.length === 0) {
    return null
  }

  return (
    <Card className="border-warning/35">
      <CardHeader>
        <CardTitle className="text-base">Unplanned Spending</CardTitle>
        <p className="text-sm text-muted-foreground">
          These expense categories have actual spending but no budget allocation.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((row) => (
          <div
            key={row.categoryId}
            className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: row.categoryColor }}
              >
                {renderIconByName(row.categoryIcon, 'size-4')}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {row.categoryName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.actualAmountText} spent this month
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddBudget(row.categoryId)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Budget
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
