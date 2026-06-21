import { MonthSelector } from '@/components/app/month-selector'
import { shiftBudgetMonth } from '@/data/planner/planner-selectors'

type PlannerMonthSelectorProps = {
  month: string
  monthLabel: string
  onMonthChange: (month: string) => void
}

export function PlannerMonthSelector({
  month,
  monthLabel,
  onMonthChange,
}: PlannerMonthSelectorProps) {
  return (
    <MonthSelector
      month={month}
      monthLabel={monthLabel}
      description="Plan category spending for the selected month."
      onMonthChange={onMonthChange}
      onPreviousMonth={() => onMonthChange(shiftBudgetMonth(month, -1))}
      onNextMonth={() => onMonthChange(shiftBudgetMonth(month, 1))}
    />
  )
}
