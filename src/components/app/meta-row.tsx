import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function MetaRow({
  children,
  className,
  icon: Icon,
  label,
}: {
  children: ReactNode
  className?: string
  icon?: LucideIcon
  label?: ReactNode
}) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-6 text-muted-foreground',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      {label ? <span className="font-medium text-foreground">{label}</span> : null}
      <span>{children}</span>
    </p>
  )
}
