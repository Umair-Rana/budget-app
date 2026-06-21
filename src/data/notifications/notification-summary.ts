import type { AppNotification } from '@/data/notifications/notification-types'

export type NotificationSummary = {
  notifications: AppNotification[]
  totalCount: number
  highestPriorityNotifications: AppNotification[]
}

export function createNotificationSummary(
  notifications: AppNotification[],
  limit = 5,
): NotificationSummary {
  return {
    notifications,
    totalCount: notifications.length,
    highestPriorityNotifications: notifications.slice(0, limit),
  }
}
