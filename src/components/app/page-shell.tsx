import type { ReactNode } from 'react'

import {
  PageHeader,
  type PageBreadcrumbItem,
} from '@/components/app/page-header'

type PageShellProps = {
  title: string
  description: string
  eyebrow?: string
  badges?: string[]
  breadcrumb?: PageBreadcrumbItem[]
  action?: ReactNode
  children: ReactNode
}

export function PageShell({
  action,
  breadcrumb,
  title,
  description,
  eyebrow,
  badges,
  children,
}: PageShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        action={action}
        badges={badges}
        breadcrumb={breadcrumb}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      {children}
    </section>
  )
}
