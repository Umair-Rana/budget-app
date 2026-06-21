import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

type MonthSelectorProps = {
  description: string
  month: string
  monthLabel: string
  onCurrentMonth?: () => void
  onMonthChange: (month: string) => void
  onNextMonth: () => void
  onPreviousMonth: () => void
  title?: string
}

const monthInputClassName =
  'h-10 rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25'

function updateMonth(value: string, onMonthChange: (month: string) => void) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    onMonthChange(value)
  }
}

export function MonthSelector({
  description,
  month,
  monthLabel,
  onCurrentMonth,
  onMonthChange,
  onNextMonth,
  onPreviousMonth,
  title = monthLabel,
}: MonthSelectorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card/70 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          title="Previous month"
          onClick={onPreviousMonth}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <input
          type="month"
          className={monthInputClassName}
          value={month}
          aria-label="Selected month"
          onChange={(event) => updateMonth(event.target.value, onMonthChange)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          title="Next month"
          onClick={onNextMonth}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        {onCurrentMonth ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Return to current month"
            onClick={onCurrentMonth}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Current
          </Button>
        ) : null}
      </div>
    </div>
  )
}
