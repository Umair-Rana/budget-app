import { MoreMenuSection } from '@/components/app/more-menu-section'
import { PageShell } from '@/components/app/page-shell'
import { moreNavGroups } from '@/lib/navigation'

export function MorePage() {
  return (
    <PageShell
      eyebrow="More"
      title="Money tools and settings"
      description="Planner, loans, accounts, reports, audit history, and app preferences stay grouped away from the primary navigation."
    >
      <div className="flex flex-col gap-6">
        {moreNavGroups.map((group) => (
          <MoreMenuSection
            key={group.title}
            group={group}
            className={group.title === 'App' ? 'lg:hidden' : undefined}
          />
        ))}
      </div>
    </PageShell>
  )
}
