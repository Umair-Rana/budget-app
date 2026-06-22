import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { BrandMark } from '@/components/app/brand-mark'
import { Separator } from '@/components/ui/separator'
import {
  desktopMoreNavItems,
  desktopMoreRouteHrefs,
  primaryNavItems,
  settingsNavItem,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'

function isNavItemActive(href: string, pathname: string) {
  if (href === '/') {
    return pathname === '/'
  }

  if (href === '/more') {
    return pathname === '/more' || desktopMoreRouteHrefs.has(pathname)
  }

  if (href === '/bills') {
    return pathname === '/bills' || pathname === '/recurring-bills'
  }

  return pathname === href
}

export function DesktopSidebar() {
  const { pathname } = useLocation()
  const SettingsIcon = settingsNavItem.icon
  const moreNavItem = primaryNavItems.find((item) => item.href === '/more')
  const MoreIcon = moreNavItem?.icon
  const standardNavItems = primaryNavItems.filter((item) => item.href !== '/more')
  const isMoreChildActive = desktopMoreRouteHrefs.has(pathname)
  const isMoreNavigationActive = pathname === '/more' || isMoreChildActive
  const [userMoreExpanded, setUserMoreExpanded] = useState(false)
  const moreExpanded = isMoreNavigationActive || userMoreExpanded
  const morePanelId = 'desktop-more-navigation'

  return (
    <aside className="hidden h-svh w-72 shrink-0 overflow-y-auto overscroll-contain border-r bg-card/80 px-4 py-5 shadow-sm lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Household Finance
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Monthly budget workspace
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      <nav className="flex flex-col gap-1" aria-label="Primary navigation">
        {standardNavItems.map((item) => {
          const Icon = item.icon
          const active = isNavItemActive(item.href, pathname)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active &&
                  'bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-primary/15',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{item.title}</span>
            </NavLink>
          )
        })}

        {moreNavItem ? (
          <div className="flex flex-col">
            <button
              type="button"
              aria-controls={morePanelId}
              aria-expanded={moreExpanded}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isMoreNavigationActive &&
                  'bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-primary/15',
              )}
              onClick={() => {
                if (!isMoreNavigationActive) {
                  setUserMoreExpanded((expanded) => !expanded)
                }
              }}
            >
              {MoreIcon ? <MoreIcon className="size-4" aria-hidden="true" /> : null}
              <span className="flex-1">{moreNavItem.title}</span>
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  moreExpanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            <div
              id={morePanelId}
              className={cn(
                'grid transition-all duration-200 ease-out',
                moreExpanded
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="ml-5 mt-1 flex flex-col gap-1 border-l pl-3">
                  {desktopMoreNavItems.map((item) => {
                    const Icon = item.icon
                    const active = pathname === item.href

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setUserMoreExpanded(true)}
                        className={cn(
                          'flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active &&
                            'bg-primary/10 text-primary dark:bg-primary/15',
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        <span>{item.title}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <NavLink
          to={settingsNavItem.href}
          aria-current={pathname === settingsNavItem.href ? 'page' : undefined}
          className={cn(
            'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            pathname === settingsNavItem.href &&
              'bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-primary/15',
          )}
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
          <span>{settingsNavItem.title}</span>
        </NavLink>

        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-medium text-foreground">Local data MVP</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Accounts and categories are stored locally on this device.
          </p>
        </div>
      </div>
    </aside>
  )
}
