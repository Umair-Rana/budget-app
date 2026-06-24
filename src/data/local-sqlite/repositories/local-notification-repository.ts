import type { AppNotification } from '@/data/notifications/notification-types'
import { fromLocalNotificationRow } from '@/data/local-sqlite/mappers'
import type { LocalNotificationRow } from '@/data/local-sqlite/local-finance-row-types'
import type { LocalSqliteRepositoryContext } from '@/data/local-sqlite/repositories/local-repository-utils'

export type LocalNotificationRepository = {
  getById(id: string): Promise<AppNotification | undefined>
  listByHousehold(): Promise<AppNotification[]>
}

export function createLocalNotificationRepository(
  context: LocalSqliteRepositoryContext,
): LocalNotificationRepository {
  return {
    async getById(id: string) {
      const rows = await context.driver.query<LocalNotificationRow>(
        [
          'select * from notifications',
          'where household_id = ?',
          'and id = ?',
          'and deleted_at is null',
          'limit 1',
        ].join(' '),
        [context.householdId, id],
      )
      return rows[0] ? fromLocalNotificationRow(rows[0]) : undefined
    },
    async listByHousehold() {
      const rows = await context.driver.query<LocalNotificationRow>(
        [
          'select * from notifications',
          'where household_id = ?',
          'and deleted_at is null',
          'order by created_at desc',
        ].join(' '),
        [context.householdId],
      )
      return rows.map(fromLocalNotificationRow)
    },
  }
}
