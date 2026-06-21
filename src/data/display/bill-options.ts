import type { BillFrequency, BillStatus } from '@/data/models/bill'

export const billFrequencyOptions: {
  value: BillFrequency
  label: string
}[] = [
  { value: 'none', label: 'None' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function getBillFrequencyLabel(frequency: BillFrequency) {
  return (
    billFrequencyOptions.find((option) => option.value === frequency)?.label ??
    frequency
  )
}

export function getBillStatusLabel(status: BillStatus) {
  if (status === 'paid') {
    return 'Paid'
  }

  if (status === 'overdue') {
    return 'Overdue'
  }

  if (status === 'upcoming') {
    return 'Upcoming'
  }

  return 'Pending'
}
