import { AmountDisplay } from '@/components/app/amount-display'

export function ReportAmount({
  className,
  prefixClassName,
  value,
}: {
  className?: string
  prefixClassName?: string
  value: string
}) {
  return (
    <AmountDisplay
      value={value}
      className={className}
      prefixClassName={prefixClassName}
    />
  )
}
