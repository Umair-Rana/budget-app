import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SectionCard({
  action,
  children,
  className,
  contentClassName,
  description,
  headerClassName,
  icon: Icon,
  title,
  titleClassName,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  description?: ReactNode
  headerClassName?: string
  icon?: LucideIcon
  title: ReactNode
  titleClassName?: string
}) {
  return (
    <Card className={className}>
      <CardHeader
        className={cn(
          action &&
            'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
          headerClassName,
        )}
      >
        <div className="min-w-0">
          <CardTitle
            className={cn('flex items-center gap-2 text-base', titleClassName)}
          >
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {title}
          </CardTitle>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
