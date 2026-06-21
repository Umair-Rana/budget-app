import { History } from 'lucide-react'

import { EmptyState } from '@/components/app/empty-state'
import { PageShell } from '@/components/app/page-shell'

export function AuditHistoryPage() {
  return (
    <PageShell
      title="Audit History"
      description="Significant cloud household edits and linked source changes will be visible here when audit tracking is introduced."
      breadcrumb={[{ label: 'More', href: '/more' }]}
    >
      <EmptyState
        icon={History}
        title="No audit history yet"
        message="Important account, transaction, bill, goal, and loan changes will appear here."
      />
    </PageShell>
  )
}
