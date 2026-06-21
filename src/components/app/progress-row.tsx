import type { CSSProperties, ReactNode } from 'react'

import { AmountDisplay, type AmountDisplayTone } from '@/components/app/amount-display'
import { cn } from '@/lib/utils'

export type ProgressRowTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const fillClassNames: Record<ProgressRowTone, string> = {
  danger: 'bg-destructive',
  default: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
}

export function ProgressRow({
  amount,
  className,
  fillClassName,
  fillStyle,
  label,
  percent,
  percentLabel = `${percent}%`,
  target,
  tone = 'default',
  value,
  valueTone = 'default',
}: {
  amount?: number | string
  className?: string
  fillClassName?: string
  fillStyle?: CSSProperties
  label: ReactNode
  percent: number
  percentLabel?: ReactNode
  target?: ReactNode
  tone?: ProgressRowTone
  value?: ReactNode
  valueTone?: AmountDisplayTone
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {amount !== undefined ? (
            <>
              <AmountDisplay value={amount} tone={valueTone} />
              {target ? <span> / {target}</span> : null}
            </>
          ) : (
            value ?? percentLabel
          )}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            fillClassNames[tone],
            fillClassName,
          )}
          style={{ width: `${percent}%`, ...fillStyle }}
        />
      </div>
    </div>
  )
}
