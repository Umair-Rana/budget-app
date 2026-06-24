import type { AppNotification } from '@/data/notifications/notification-types'
import type { LocalNotificationRow } from '@/data/local-sqlite/local-finance-row-types'

export function fromLocalNotificationRow(
  row: LocalNotificationRow,
): AppNotification {
  return {
    actionLabel: 'Open',
    actionRoute: '/',
    createdAt: row.created_at,
    dismissible: true,
    id: row.id,
    message: row.message,
    priority: 0,
    severity: 'info',
    title: row.title,
    type: row.type,
  }
}

export function toLocalNotificationRow(
  notification: AppNotification,
  context: { householdId: string; userId?: string },
): LocalNotificationRow {
  return {
    created_at: notification.createdAt,
    deleted_at: null,
    dismissed_at: null,
    entity_id: null,
    entity_type: null,
    household_id: context.householdId,
    id: notification.id,
    message: notification.message,
    read_at: null,
    title: notification.title,
    type: notification.type,
    updated_at: notification.createdAt,
    user_id: context.userId ?? null,
  }
}
