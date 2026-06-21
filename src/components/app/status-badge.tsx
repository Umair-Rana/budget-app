import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusBadgeTone =
  | 'neutral'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const toneClassNames: Record<
  StatusBadgeTone,
  {
    className?: string
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'info'
  }
> = {
  danger: {
    className: 'border-destructive/35 text-destructive',
    variant: 'outline',
  },
  info: {
    variant: 'info',
  },
  neutral: {
    variant: 'secondary',
  },
  outline: {
    variant: 'outline',
  },
  success: {
    variant: 'success',
  },
  warning: {
    variant: 'warning',
  },
}

export function StatusBadge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: StatusBadgeTone
}) {
  const toneClasses = toneClassNames[tone]

  return (
    <Badge
      variant={toneClasses.variant}
      className={cn(toneClasses.className, className)}
    >
      {children}
    </Badge>
  )
}
