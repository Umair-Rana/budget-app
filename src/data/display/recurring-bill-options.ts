import type { RecurringBillFrequency } from '@/data/models/recurring-bill'

export const recurringBillFrequencyOptions: {
  value: RecurringBillFrequency
  label: string
}[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function getRecurringBillFrequencyLabel(
  frequency: RecurringBillFrequency,
) {
  return (
    recurringBillFrequencyOptions.find((option) => option.value === frequency)
      ?.label ?? frequency
  )
}
