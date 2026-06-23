import { Outlet } from 'react-router-dom'

import { BrandMark } from '@/components/app/brand-mark'
import { ConnectionStatusBanner } from '@/components/app/connection-status-banner'
import { DesktopSidebar } from '@/components/app/desktop-sidebar'
import { MobileBottomNav } from '@/components/app/mobile-bottom-nav'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useAndroidBackButton } from '@/hooks/use-android-back-button'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'
import {
  getHouseholdDisplayName,
  getHouseholdHeaderDetails,
} from '@/lib/household-display'

export function AppLayout() {
  useAndroidBackButton()

  const { cloudHousehold } = useFinanceDataSource()
  const householdName = getHouseholdDisplayName(cloudHousehold)
  const householdDetails = getHouseholdHeaderDetails(cloudHousehold)

  return (
    <div className="min-h-svh bg-background pt-[env(safe-area-inset-top)] text-foreground lg:h-svh lg:overflow-hidden">
      <div className="flex min-h-svh lg:h-svh lg:min-h-0">
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col lg:h-svh lg:min-h-0">
          <header className="sticky top-0 z-30 shrink-0 border-b bg-background/90 px-4 py-3 backdrop-blur lg:static lg:px-8">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <BrandMark />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {householdName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Budget workspace
                  </p>
                </div>
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="text-sm font-medium text-foreground">
                  {householdName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {householdDetails}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <ConnectionStatusBanner />

          <main className="flex-1 px-4 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-8 lg:py-8 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}
