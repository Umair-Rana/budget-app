import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SummaryStatTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const toneClassNames: Record<
  SummaryStatTone,
  {
    card?: string
    icon: string
  }
> = {
  default: {
    icon: 'bg-primary/10 text-primary',
  },
  success: {
    card: 'border-success/25',
    icon: 'bg-success/10 text-success',
  },
  warning: {
    card: 'border-warning/35',
    icon: 'bg-warning/10 text-warning',
  },
  danger: {
    card: 'border-destructive/40',
    icon: 'bg-destructive/10 text-destructive',
  },
  info: {
    card: 'border-info/25',
    icon: 'bg-info/10 text-info',
  },
}

export function SummaryStatCard({
  icon: Icon,
  helper,
  label,
  tone = 'default',
  value,
}: {
  helper?: string
  icon: LucideIcon
  label: string
  tone?: SummaryStatTone
  value: string
}) {
  const toneClasses = toneClassNames[tone]

  return (
    <Card className={cn('relative overflow-hidden', toneClasses.card)}>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="text-sm">{label}</CardTitle>
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-lg',
            toneClasses.icon,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {helper ? (
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
