import type { ReactNode } from 'react'

import { AmountDisplay, type AmountDisplayTone } from '@/components/app/amount-display'
import { cn } from '@/lib/utils'

export function DetailLine({
  amount,
  className,
  label,
  value,
  valueClassName,
  valueTone = 'default',
  valueSize = 'default',
}: {
  amount?: number | string
  className?: string
  label: ReactNode
  value?: ReactNode
  valueClassName?: string
  valueTone?: AmountDisplayTone
  valueSize?: 'default' | 'large' | 'xl'
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 font-semibold text-foreground',
          valueSize === 'large' && 'text-lg',
          valueSize === 'xl' && 'text-xl',
          valueClassName,
        )}
      >
        {amount !== undefined ? (
          <AmountDisplay value={amount} tone={valueTone} />
        ) : (
          value
        )}
      </p>
    </div>
  )
}
