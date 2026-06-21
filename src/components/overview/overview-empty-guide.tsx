import { ArrowRight, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const setupSteps = [
  'Create Account',
  'Add Transaction',
  'Add Bill',
  'Add Goal',
]

export function OverviewEmptyGuide() {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <WalletCards className="size-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">
          Start with your first account.
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Once accounts and records exist, this overview will show real balances,
          monthly totals, upcoming bills, goals, and loans.
        </p>

        <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-4">
          {setupSteps.map((step, index) => (
            <div key={step} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {step}
              </p>
            </div>
          ))}
        </div>

        <Button asChild className="mt-5">
          <Link to="/accounts">
            Create Account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
