import { getFinanceDb } from '@/data/db/finance-db'
import type { AccountsRepositoryContract } from '@/data/contracts/accounts-contract'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '@/data/models/account'
import { createRecordId, createTimestamp } from '@/data/models/common'
import { RepositoryRecordNotFoundError } from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'

function isVisibleAccount(account: Account, options?: RepositoryListOptions) {
  if (!options?.includeDeleted && account.deletedAt) {
    return false
  }

  if (!options?.includeArchived && account.archivedAt) {
    return false
  }

  return true
}

async function requireAccount(id: string) {
  const account = await accountsRepository.getById(id, {
    includeArchived: true,
    includeDeleted: true,
  })

  if (!account) {
    throw new RepositoryRecordNotFoundError('Account', id)
  }

  return account
}

export const accountsRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const accounts = await db.getAll('accounts')

    return accounts.filter((account) => isVisibleAccount(account, options))
  },

  async getById(id: string, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const account = await db.get('accounts', id)

    if (!account || !isVisibleAccount(account, options)) {
      return undefined
    }

    return account
  },

  async create(input: CreateAccountInput) {
    const db = await getFinanceDb()
    const now = createTimestamp()
    const account: Account = {
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

    await db.add('accounts', account)

    return account
  },

  async update(id: string, input: UpdateAccountInput) {
    const db = await getFinanceDb()
    const current = await requireAccount(id)
    const updated: Account = {
      ...current,
      ...input,
      currentBalance: input.openingBalance ?? current.currentBalance,
      updatedAt: createTimestamp(),
    }

    await db.put('accounts', updated)

    return updated
  },

  async archive(id: string) {
    const db = await getFinanceDb()
    const current = await requireAccount(id)
    const now = createTimestamp()
    const updated: Account = {
      ...current,
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await db.put('accounts', updated)

    return updated
  },

  async deleteSoft(id: string) {
    const db = await getFinanceDb()
    const current = await requireAccount(id)
    const now = createTimestamp()
    const updated: Account = {
      ...current,
      deletedAt: current.deletedAt ?? now,
      updatedAt: now,
    }

    await db.put('accounts', updated)

    return updated
  },
} satisfies AccountsRepositoryContract
