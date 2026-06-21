import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'

export type PageBreadcrumbItem = {
  label: string
  href: string
}

type PageHeaderProps = {
  title: string
  description: string
  eyebrow?: string
  badges?: string[]
  breadcrumb?: PageBreadcrumbItem[]
  action?: ReactNode
}

export function PageHeader({
  action,
  badges,
  breadcrumb,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  const parent = breadcrumb?.at(-1)

  return (
    <header className="flex flex-col gap-3">
      {parent ? (
        <div className="lg:hidden">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <Link
              to={parent.href}
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {parent.label}
            </Link>
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              {title}
            </p>
          </div>
        </div>
      ) : null}

      {breadcrumb?.length ? (
        <nav className="hidden text-sm text-muted-foreground lg:flex">
          <ol className="flex min-w-0 items-center gap-1.5">
            {breadcrumb.map((item) => (
              <li key={item.href} className="flex min-w-0 items-center gap-1.5">
                <Link
                  to={item.href}
                  className="rounded-md px-1 py-0.5 font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </li>
            ))}
            <li className="min-w-0 truncate font-medium text-foreground">
              {title}
            </li>
          </ol>
        </nav>
      ) : eyebrow ? (
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        {action || badges?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {badges?.map((badge) => (
              <Badge key={badge} variant="secondary">
                {badge}
              </Badge>
            ))}
            {action}
          </div>
        ) : null}
      </div>
    </header>
  )
}
