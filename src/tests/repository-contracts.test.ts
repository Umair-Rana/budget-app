import { describe, expect, it } from 'vitest'

import {
  createSupabaseFinanceDataSource,
  indexedDbFinanceDataSource,
  supabaseFinanceDataSource,
} from '@/data/data-source/finance-data-source'
import { inactiveSupabaseFinanceRepositoryMessage } from '@/data/supabase/repositories/inactive-supabase-repository'
import type { Database } from '@/lib/supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const repositoryGroups = [
  'accounts',
  'categories',
  'transactions',
  'bills',
  'goals',
  'loans',
  'budgets',
  'recurringTransactions',
] as const

const commonMethods = [
  'getAll',
  'getById',
  'create',
  'update',
  'archive',
  'deleteSoft',
] as const

describe('finance data source contracts', () => {
  it('keeps IndexedDB available as a legacy implementation only', () => {
    expect(indexedDbFinanceDataSource.mode).toBe('indexeddb')
    expect(supabaseFinanceDataSource.mode).toBe('supabase')
  })

  it('creates the runtime Supabase data source through explicit context', () => {
    const dataSource = createSupabaseFinanceDataSource({
      client: {} as SupabaseClient<Database>,
      householdId: 'household-1',
      userId: 'user-1',
    })

    expect(dataSource.mode).toBe('supabase')
    expect(dataSource).not.toBe(supabaseFinanceDataSource)
  })

  it('exposes the required repository groups', () => {
    for (const group of repositoryGroups) {
      expect(indexedDbFinanceDataSource[group]).toBeDefined()
    }
  })

  it('exposes common repository methods for every group', () => {
    for (const group of repositoryGroups) {
      for (const method of commonMethods) {
        expect(indexedDbFinanceDataSource[group][method]).toEqual(
          expect.any(Function),
        )
      }
    }
  })

  it('exposes module-specific repository methods', () => {
    expect(indexedDbFinanceDataSource.categories.getByType).toEqual(
      expect.any(Function),
    )
    expect(
      indexedDbFinanceDataSource.categories.seedDefaultsIfNeeded,
    ).toEqual(expect.any(Function))
    expect(indexedDbFinanceDataSource.transactions.getByType).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.bills.markPaid).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.bills.markUnpaid).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.goals.addContribution).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.goals.withdraw).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.loans.recordPayment).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.budgets.getByMonth).toEqual(
      expect.any(Function),
    )
    expect(indexedDbFinanceDataSource.recurringTransactions.getDue).toEqual(
      expect.any(Function),
    )
    expect(
      indexedDbFinanceDataSource.recurringTransactions.generateDue,
    ).toEqual(expect.any(Function))
  })

  it('keeps Supabase repository stubs inactive', async () => {
    await expect(supabaseFinanceDataSource.accounts.getAll()).rejects.toThrow(
      inactiveSupabaseFinanceRepositoryMessage,
    )
  })
})
