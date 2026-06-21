import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import {
  dismissNotificationId,
  filterDismissedNotifications,
  getNotificationDismissalStorageKey,
  readDismissedNotificationIds,
} from '@/data/notifications/notification-dismissals'
import {
  getNotificationSummary,
  notificationsQueryKey,
} from '@/data/notifications/notification-queries'
import { createNotificationSummary } from '@/data/notifications/notification-summary'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'

export function useNotifications() {
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const storageKey = getNotificationDismissalStorageKey(dataSourceKey)
  const [dismissalState, setDismissalState] = useState(() => ({
    dismissedIds: readDismissedNotificationIds(storageKey),
    storageKey,
  }))
  const notificationsQuery = useQuery({
    queryKey: [...notificationsQueryKey, dataSourceKey],
    queryFn: () => getNotificationSummary(dataSource),
  })
  const dismissedIds =
    dismissalState.storageKey === storageKey
      ? dismissalState.dismissedIds
      : readDismissedNotificationIds(storageKey)

  const visibleNotifications = useMemo(
    () =>
      filterDismissedNotifications(
        notificationsQuery.data?.notifications ?? [],
        dismissedIds,
      ),
    [dismissedIds, notificationsQuery.data?.notifications],
  )
  const visibleSummary = useMemo(
    () => createNotificationSummary(visibleNotifications),
    [visibleNotifications],
  )

  function dismissNotification(notificationId: string) {
    setDismissalState({
      dismissedIds: dismissNotificationId(storageKey, notificationId),
      storageKey,
    })
  }

  return {
    dismissNotification,
    dismissedIds,
    notificationsQuery,
    summary: visibleSummary,
  }
}
