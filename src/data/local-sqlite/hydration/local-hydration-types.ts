import type { SupabaseClient } from '@supabase/supabase-js'

import type { FinanceDataSource } from '@/data/contracts'
import type {
  LocalHouseholdMemberRow,
  LocalHouseholdRow,
} from '@/data/local-sqlite/local-finance-row-types'
import type { LocalSqliteDriver } from '@/data/local-sqlite/local-sqlite-types'
import type { Database } from '@/lib/supabase/database.types'

export const localHydrationEntityTypes = [
  'households',
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurring_transactions',
  'recurring_bills',
  'notifications',
] as const

export type LocalHydrationEntityType =
  (typeof localHydrationEntityTypes)[number]

export type LocalHydrationTableCounts = {
  accounts: number
  bills: number
  budgets: number
  categories: number
  goals: number
  householdMembers: number
  households: number
  loans: number
  notifications: number
  recurringBills: number
  recurringTransactions: number
  transactions: number
}

export type LocalHydrationResult = {
  completedAt: string
  errors: string[]
  householdId: string
  startedAt: string
  tables: LocalHydrationTableCounts
}

export type LocalHydrationHouseholdSnapshot = {
  household: LocalHouseholdRow
  householdMembers: readonly LocalHouseholdMemberRow[]
}

export type SupabaseToLocalHydrationInput = {
  dataSource: FinanceDataSource
  householdId: string
  householdSnapshot?: LocalHydrationHouseholdSnapshot
  localDriver: LocalSqliteDriver
  now?: Date
  supabaseClient?: SupabaseClient<Database>
  userId?: string
}

export type LocalHydrationSmokeTestInput = SupabaseToLocalHydrationInput
