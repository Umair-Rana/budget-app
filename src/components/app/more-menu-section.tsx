import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import type { MoreNavGroup } from '@/lib/navigation'
import { cn } from '@/lib/utils'

type MoreMenuSectionProps = {
  group: MoreNavGroup
  className?: string
}

export function MoreMenuSection({ className, group }: MoreMenuSectionProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="px-1 text-sm font-semibold text-foreground">
        {group.title}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {group.items.map((item) => {
          const Icon = item.icon

          return (
            <Card
              key={item.href}
              className="transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <Link
                to={item.href}
                className="flex min-h-24 items-center gap-4 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
