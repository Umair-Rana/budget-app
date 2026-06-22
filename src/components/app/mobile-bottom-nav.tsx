import { NavLink, useLocation } from 'react-router-dom'

import { moreRouteHrefs, primaryNavItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

function isNavItemActive(href: string, pathname: string) {
  if (href === '/') {
    return pathname === '/'
  }

  if (href === '/more') {
    return pathname === '/more' || moreRouteHrefs.has(pathname)
  }

  if (href === '/bills') {
    return pathname === '/bills' || pathname === '/recurring-bills'
  }

  return pathname === href
}

export function MobileBottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      aria-label="Primary navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon
          const active = isNavItemActive(item.href, pathname)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs',
                active && 'bg-primary/10 text-primary dark:bg-primary/15',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.title}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
