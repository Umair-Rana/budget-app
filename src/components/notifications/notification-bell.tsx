import { Bell } from 'lucide-react'

import { NotificationItem } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/use-notifications'

export function NotificationBell() {
  const { dismissNotification, notificationsQuery, summary } =
    useNotifications()
  const count = summary.totalCount

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            count > 0
              ? `Open notifications, ${count} active`
              : 'Open notifications'
          }
          title={count > 0 ? `${count} active notifications` : 'Notifications'}
          className="relative"
        >
          <Bell className="size-4" aria-hidden="true" />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-destructive-foreground">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>Notifications</span>
          <span className="text-xs font-normal text-muted-foreground">
            {notificationsQuery.isLoading
              ? 'Loading'
              : `${count} active`}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notificationsQuery.isError ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            Notifications could not be loaded.
          </div>
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.isError &&
        count === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            Nothing needs attention right now.
          </div>
        ) : null}

        {summary.highestPriorityNotifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto p-1">
            {summary.highestPriorityNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                compact
                notification={notification}
                onDismiss={dismissNotification}
              />
            ))}
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
