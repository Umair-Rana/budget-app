import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

import { NotificationItem } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useNotifications } from '@/hooks/use-notifications'

export function OverviewNotifications() {
  const { dismissNotification, notificationsQuery, summary } =
    useNotifications()
  const notifications = summary.highestPriorityNotifications

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Notifications</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Important household finance items that need attention.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {notificationsQuery.isLoading ? (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : null}

        {notificationsQuery.isError ? (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center text-sm text-muted-foreground">
            Notifications could not be loaded.
          </div>
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.isError &&
        notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
            <Bell
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              No active reminders.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bills, budgets, recurring items, goals, and loans will appear here
              when they need attention.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/bills">Open Bills</Link>
            </Button>
          </div>
        ) : null}

        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
          />
        ))}
      </CardContent>
    </Card>
  )
}
