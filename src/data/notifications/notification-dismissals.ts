import type { AppNotification } from '@/data/notifications/notification-types'

export const notificationDismissalStorageKeyPrefix =
  'household-finance:dismissed-notifications'

type NotificationStorage = Pick<Storage, 'getItem' | 'setItem'>

function getBrowserStorage(): NotificationStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export function getNotificationDismissalStorageKey(scope: string) {
  return `${notificationDismissalStorageKeyPrefix}:${scope}`
}

export function readDismissedNotificationIds(
  storageKey: string,
  storage: NotificationStorage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return new Set<string>()
  }

  try {
    const rawValue = storage.getItem(storageKey)
    const values = rawValue ? JSON.parse(rawValue) : []

    return new Set(
      Array.isArray(values)
        ? values.filter((value): value is string => typeof value === 'string')
        : [],
    )
  } catch {
    return new Set<string>()
  }
}

export function writeDismissedNotificationIds(
  storageKey: string,
  dismissedIds: Iterable<string>,
  storage: NotificationStorage | undefined = getBrowserStorage(),
) {
  if (!storage) {
    return
  }

  storage.setItem(storageKey, JSON.stringify([...dismissedIds].sort()))
}

export function dismissNotificationId(
  storageKey: string,
  notificationId: string,
  storage: NotificationStorage | undefined = getBrowserStorage(),
) {
  const dismissedIds = readDismissedNotificationIds(storageKey, storage)

  dismissedIds.add(notificationId)
  writeDismissedNotificationIds(storageKey, dismissedIds, storage)

  return dismissedIds
}

export function filterDismissedNotifications(
  notifications: AppNotification[],
  dismissedIds: ReadonlySet<string>,
) {
  return notifications.filter((notification) => !dismissedIds.has(notification.id))
}
