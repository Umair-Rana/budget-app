import {
  fromLocalHouseholdMemberRow,
  fromLocalHouseholdRow,
} from '@/data/local-sqlite/mappers'
import type {
  LocalHousehold,
  LocalHouseholdMember,
  LocalHouseholdMemberRow,
  LocalHouseholdRow,
} from '@/data/local-sqlite/local-finance-row-types'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'

export type LocalHouseholdRepository = {
  getById(id: string): Promise<LocalHousehold | undefined>
  listMembers(householdId: string): Promise<LocalHouseholdMember[]>
}

export function createLocalHouseholdRepository(
  driver: LocalSqliteDriver,
): LocalHouseholdRepository {
  return {
    async getById(id: string) {
      const rows = await driver.query<LocalHouseholdRow>(
        'select * from households where id = ? and deleted_at is null limit 1',
        [id],
      )
      return rows[0] ? fromLocalHouseholdRow(rows[0]) : undefined
    },
    async listMembers(householdId: string) {
      const rows = await driver.query<LocalHouseholdMemberRow>(
        [
          'select * from household_members',
          'where household_id = ?',
          'and deleted_at is null',
          'order by role',
        ].join(' '),
        [householdId],
      )
      return rows.map(fromLocalHouseholdMemberRow)
    },
  }
}
