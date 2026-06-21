import {
  Bell,
  CalendarClock,
  CheckCircle2,
  PiggyBank,
  ReceiptText,
  Target,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import type {
  AppNotification,
  AppNotificationSeverity,
} from '@/data/notifications/notification-types'
import { cn } from '@/lib/utils'

type NotificationItemProps = {
  notification: AppNotification
  compact?: boolean
  onDismiss: (notificationId: string) => void
}

const severityClassNames: Record<AppNotificationSeverity, string> = {
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}

const typeIcons: Partial<Record<AppNotification['type'], LucideIcon>> = {
  'bill-due-today': ReceiptText,
  'bill-due-tomorrow': ReceiptText,
  'bill-overdue': TriangleAlert,
  'budget-danger': PiggyBank,
  'budget-warning': PiggyBank,
  'goal-complete': Target,
  'goal-exceeded': Target,
  'loan-complete': CheckCircle2,
  'recurring-due-today': CalendarClock,
  'recurring-overdue': CalendarClock,
}

function parseDate(value: string) {
  const timestamp = Date.parse(value.includes('T') ? value : `${value}T00:00:00`)

  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function relativeDateLabel(value: string, now = new Date()) {
  const date = parseDate(value)

  if (!date) {
    return 'Recently'
  }

  const dayDelta = Math.round(
    (dateOnly(date).getTime() - dateOnly(now).getTime()) / 86_400_000,
  )

  if (dayDelta === -1) {
    return 'Yesterday'
  }

  if (dayDelta === 0) {
    return 'Today'
  }

  if (dayDelta === 1) {
    return 'Tomorrow'
  }

  if (dayDelta < 0) {
    return `${Math.abs(dayDelta)} days ago`
  }

  return `In ${dayDelta} days`
}

export function NotificationItem({
  compact,
  notification,
  onDismiss,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] ?? Bell

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-background p-3',
        compact && 'border-transparent bg-transparent px-2 py-2',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          severityClassNames[notification.severity],
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {notification.message}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {relativeDateLabel(notification.createdAt)}
            </p>
          </div>

          {notification.dismissible ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={`Dismiss ${notification.title}`}
              title={`Dismiss ${notification.title}`}
              onClick={() => onDismiss(notification.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={notification.actionRoute}>{notification.actionLabel}</Link>
          </Button>
          {compact ? null : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(notification.id)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
