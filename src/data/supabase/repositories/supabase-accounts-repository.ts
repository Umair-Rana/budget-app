import type { AccountsRepositoryContract } from '@/data/contracts'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/data/models/account'
import { createRecordId, createTimestamp } from '@/data/models/common'
import { RepositoryRecordNotFoundError } from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import {
  fromSupabaseAccountRow,
  toSupabaseAccountInsert,
  toSupabaseAccountUpdate,
} from '@/data/supabase/mappers/account-mapper'
import { throwInactiveSupabaseFinanceRepository } from '@/data/supabase/repositories/inactive-supabase-repository'
import {
  isSupabaseUniqueConstraintError,
  throwSupabaseRepositoryError,
} from '@/data/supabase/repositories/supabase-repository-errors'
import {
  requireSupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContext,
  type SupabaseFinanceRepositoryContextInput,
} from '@/data/supabase/repositories/supabase-repository-context'
import type { AccountRow } from '@/data/supabase/supabase-finance-types'
import type { Database } from '@/lib/supabase/database.types'

type AccountTableRow = Database['public']['Tables']['accounts']['Row']
type AccountTableInsert = Database['public']['Tables']['accounts']['Insert']
type AccountTableUpdate = Database['public']['Tables']['accounts']['Update']

function mapAccountRow(row: AccountTableRow): Account {
  return fromSupabaseAccountRow(row as AccountRow)
}

function createAccountRecord(input: CreateAccountInput): Account {
  const now = createTimestamp()

  return {
    id: createRecordId(),
    name: input.name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    currency: input.currency ?? 'PKR',
    openingBalance: input.openingBalance,
    currentBalance: input.openingBalance,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  }
}

async function requireSupabaseAccount(
  context: SupabaseFinanceRepositoryContext,
  id: string,
) {
  const account = await getSupabaseAccountById(context, id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!account) {
    throw new RepositoryRecordNotFoundError('Account', id)
  }

  return account
}

async function getSupabaseAccountById(
  context: SupabaseFinanceRepositoryContext,
  id: string,
  options?: RepositoryListOptions,
) {
  let query = context.client
    .from('accounts')
    .select('*')
    .eq('household_id', context.householdId)
    .eq('id', id)

  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null)
  }

  if (!options?.includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throwSupabaseRepositoryError('accounts.getById', error)
  }

  return data ? mapAccountRow(data) : undefined
}

function handleSupabaseAccountWriteError(operation: string, error: unknown) {
  if (isSupabaseUniqueConstraintError(error)) {
    throwSupabaseRepositoryError(operation, {
      message: 'Account uniqueness constraint was violated.',
    })
  }

  throwSupabaseRepositoryError(operation, error)
}

export const supabaseAccountsRepository = {
  async getAll() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async getById() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async create() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async update() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async archive() {
    return throwInactiveSupabaseFinanceRepository()
  },
  async deleteSoft() {
    return throwInactiveSupabaseFinanceRepository()
  },
} satisfies AccountsRepositoryContract

export function createSupabaseAccountsRepository(
  input: SupabaseFinanceRepositoryContextInput,
): AccountsRepositoryContract {
  const context = requireSupabaseFinanceRepositoryContext(input)

  return {
    async getAll(options?: RepositoryListOptions) {
      let query = context.client
        .from('accounts')
        .select('*')
        .eq('household_id', context.householdId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeArchived) {
        query = query.is('archived_at', null)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        throwSupabaseRepositoryError('accounts.getAll', error)
      }

      return (data ?? []).map(mapAccountRow)
    },

    async getById(id: string, options?: RepositoryListOptions) {
      return getSupabaseAccountById(context, id, options)
    },

    async create(input: CreateAccountInput) {
      const account = createAccountRecord(input)
      const insert = toSupabaseAccountInsert(account, {
        householdId: context.householdId,
        userId: context.userId,
      }) as AccountTableInsert

      const { data, error } = await context.client
        .from('accounts')
        .insert(insert)
        .select()
        .single()

      if (error) {
        handleSupabaseAccountWriteError('accounts.create', error)
      }

      if (!data) {
        throwSupabaseRepositoryError('accounts.create', {
          message: 'No account row was returned.',
        })
      }

      return mapAccountRow(data)
    },

    async update(id: string, input: UpdateAccountInput) {
      await requireSupabaseAccount(context, id)

      const update = toSupabaseAccountUpdate(input, {
        userId: context.userId,
        now: createTimestamp(),
      }) as AccountTableUpdate

      if ('openingBalance' in input) {
        update.current_balance = input.openingBalance
      }

      const { data, error } = await context.client
        .from('accounts')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        handleSupabaseAccountWriteError('accounts.update', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Account', id)
      }

      return mapAccountRow(data)
    },

    async archive(id: string) {
      const current = await requireSupabaseAccount(context, id)
      const now = createTimestamp()
      const update: AccountTableUpdate = {
        archived_at: current.archivedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('accounts')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('accounts.archive', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Account', id)
      }

      return mapAccountRow(data)
    },

    async deleteSoft(id: string) {
      const current = await requireSupabaseAccount(context, id)
      const now = createTimestamp()
      const update: AccountTableUpdate = {
        deleted_at: current.deletedAt ?? now,
        updated_at: now,
        updated_by: context.userId,
      }

      const { data, error } = await context.client
        .from('accounts')
        .update(update)
        .eq('household_id', context.householdId)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (error) {
        throwSupabaseRepositoryError('accounts.deleteSoft', error)
      }

      if (!data) {
        throw new RepositoryRecordNotFoundError('Account', id)
      }

      return mapAccountRow(data)
    },
  }
}
