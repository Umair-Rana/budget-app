import { Target } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ProgressRow } from '@/components/app/progress-row'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardGoalSnapshot } from '@/data/dashboard/dashboard-selectors'

export function OverviewGoalsSnapshot({
  goals,
}: {
  goals: DashboardGoalSnapshot[]
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Goals Snapshot</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Active goals with saved progress.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {goals.length > 0 ? (
          goals.map((goal) => (
            <div key={goal.id} className="rounded-lg border bg-background p-3">
              <ProgressRow
                label={<span className="truncate">{goal.name}</span>}
                percent={goal.progressPercent}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {goal.currentAmountText} / {goal.targetAmountText}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Remaining {goal.remainingAmountText}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
            <Target
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              No active goals.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a goal to track progress here.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/goals">Open Goals</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
