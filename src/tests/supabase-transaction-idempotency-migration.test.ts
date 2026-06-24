import { describe, expect, it } from 'vitest'

import migrationSqlRaw from '../../supabase/migrations/0016_transaction_create_idempotency.sql?raw'

const migrationSql = migrationSqlRaw.toLowerCase()

describe('transaction create idempotency migration', () => {
  it('adds a nullable idempotency key with household-scoped uniqueness', () => {
    expect(migrationSql).toContain('add column if not exists idempotency_key text')
    expect(migrationSql).toContain(
      'on public.transactions (household_id, idempotency_key)',
    )
    expect(migrationSql).toContain('where idempotency_key is not null')
  })

  it('returns an existing idempotent transaction before applying balance impact again', () => {
    const firstReturnIndex = migrationSql.indexOf('return existing_transaction;')
    const balanceImpactIndex = migrationSql.indexOf(
      'public._apply_finance_transaction_balance_impact',
    )

    expect(firstReturnIndex).toBeGreaterThan(-1)
    expect(balanceImpactIndex).toBeGreaterThan(-1)
    expect(firstReturnIndex).toBeLessThan(balanceImpactIndex)
    expect(migrationSql).toContain('on conflict (household_id, idempotency_key)')
    expect(migrationSql).toContain('do nothing')
  })
})
