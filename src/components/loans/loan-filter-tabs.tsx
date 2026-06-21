import { loanFilterOptions, type LoanFilterValue } from '@/data/display/loan-options'
import { cn } from '@/lib/utils'

export function LoanFilterTabs({
  value,
  onChange,
}: {
  value: LoanFilterValue
  onChange: (value: LoanFilterValue) => void
}) {
  return (
    <div className="inline-flex w-full rounded-lg border bg-card p-1 sm:w-auto">
      {loanFilterOptions.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
