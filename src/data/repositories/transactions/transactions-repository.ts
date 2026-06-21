import { getFinanceDb } from '@/data/db/finance-db'
import type { TransactionsRepositoryContract } from '@/data/contracts/transactions-contract'
import {
  createTransactionDateTime,
  normalizeTransactionTime,
} from '@/data/domain/transaction-datetime'
import { isLinkedTransaction } from '@/data/domain/linked-transaction'
import type { Account } from '@/data/models/account'
import type { Category } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models/transaction'
import {
  RepositoryError,
  RepositoryRecordNotFoundError,
} from '@/data/repositories/common/repository-errors'
import type { RepositoryListOptions } from '@/data/repositories/common/repository-types'
import {
  buildTransactionImpactPlan,
  type AccountBalanceImpact,
} from '@/data/repositories/transactions/transaction-impact'

type AccountStore = {
  get: (id: EntityId) => Promise<Account | undefined>
  put: (account: Account) => Promise<unknown>
}

type CategoryStore = {
  get: (id: EntityId) => Promise<Category | undefined>
}

function isVisibleTransaction(
  transaction: Transaction,
  options?: RepositoryListOptions,
) {
  if (!options?.includeDeleted && transaction.deletedAt) {
    return false
  }

  if (!options?.includeArchived && transaction.archivedAt) {
    return false
  }

  return true
}

function assertEditableStandaloneTransaction(transaction: Transaction) {
  if (isLinkedTransaction(transaction)) {
    throw new RepositoryError(
      'Linked transactions cannot be changed from the Transactions page.',
    )
  }

  if (transaction.archivedAt || transaction.deletedAt) {
    throw new RepositoryError('Archived or deleted transactions cannot be edited.')
  }
}

function assertTransactionExists(
  transaction: Transaction | undefined,
  id: EntityId,
) {
  if (!transaction) {
    throw new RepositoryRecordNotFoundError('Transaction', id)
  }

  return transaction
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RepositoryError('Transaction amount must be greater than 0.')
  }
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RepositoryError('Transaction date is required.')
  }
}

function requireField(value: EntityId | undefined, message: string) {
  if (!value) {
    throw new RepositoryError(message)
  }

  return value
}

function sanitizeTransactionInput(
  input: CreateTransactionInput,
): CreateTransactionInput {
  const normalizedTime = normalizeTransactionTime(input.time)
  const base = {
    type: input.type,
    amount: input.amount,
    date: input.date,
    time: normalizedTime,
    transactionDateTime:
      createTransactionDateTime(input.date, normalizedTime) ??
      input.transactionDateTime,
    notes: normalizeNotes(input.notes),
    linkedBillId: input.linkedBillId,
    linkedGoalId: input.linkedGoalId,
    linkedLoanId: input.linkedLoanId,
  }

  if (input.type === 'income') {
    return {
      ...base,
      categoryId: input.categoryId,
      toAccountId: input.toAccountId,
    }
  }

  if (input.type === 'expense') {
    return {
      ...base,
      categoryId: input.categoryId,
      fromAccountId: input.fromAccountId,
    }
  }

  if (input.type === 'transfer') {
    return {
      ...base,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
    }
  }

  return {
    ...base,
    categoryId: input.categoryId,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
  }
}

function createTransactionRecord(input: CreateTransactionInput): Transaction {
  const now = createTimestamp()
  const sanitizedInput = sanitizeTransactionInput(input)

  return {
    id: createRecordId(),
    type: sanitizedInput.type,
    amount: sanitizedInput.amount,
    categoryId: sanitizedInput.categoryId,
    fromAccountId: sanitizedInput.fromAccountId,
    toAccountId: sanitizedInput.toAccountId,
    date: sanitizedInput.date,
    time: sanitizedInput.time,
    transactionDateTime: sanitizedInput.transactionDateTime,
    notes: sanitizedInput.notes,
    linkedBillId: sanitizedInput.linkedBillId,
    linkedGoalId: sanitizedInput.linkedGoalId,
    linkedLoanId: sanitizedInput.linkedLoanId,
    createdAt: now,
    updatedAt: now,
  }
}

function mergeTransactionInput(
  current: Transaction,
  input: UpdateTransactionInput,
): CreateTransactionInput {
  return {
    type: input.type ?? current.type,
    amount: input.amount ?? current.amount,
    categoryId: 'categoryId' in input ? input.categoryId : current.categoryId,
    fromAccountId:
      'fromAccountId' in input ? input.fromAccountId : current.fromAccountId,
    toAccountId: 'toAccountId' in input ? input.toAccountId : current.toAccountId,
    date: input.date ?? current.date,
    time: 'time' in input ? input.time : current.time,
    transactionDateTime:
      'transactionDateTime' in input
        ? input.transactionDateTime
        : current.transactionDateTime,
    notes: 'notes' in input ? input.notes : current.notes,
    linkedBillId:
      'linkedBillId' in input ? input.linkedBillId : current.linkedBillId,
    linkedGoalId:
      'linkedGoalId' in input ? input.linkedGoalId : current.linkedGoalId,
    linkedLoanId:
      'linkedLoanId' in input ? input.linkedLoanId : current.linkedLoanId,
  }
}

function updateTransactionRecord(
  current: Transaction,
  input: UpdateTransactionInput,
): Transaction {
  const mergedInput = mergeTransactionInput(current, input)
  const nextRecord = createTransactionRecord(mergedInput)

  return {
    ...current,
    type: nextRecord.type,
    amount: nextRecord.amount,
    categoryId: nextRecord.categoryId,
    fromAccountId: nextRecord.fromAccountId,
    toAccountId: nextRecord.toAccountId,
    date: nextRecord.date,
    time: nextRecord.time,
    transactionDateTime: nextRecord.transactionDateTime,
    notes: nextRecord.notes,
    linkedBillId: nextRecord.linkedBillId,
    linkedGoalId: nextRecord.linkedGoalId,
    linkedLoanId: nextRecord.linkedLoanId,
    updatedAt: createTimestamp(),
  }
}

async function requireActiveAccount(
  accountStore: AccountStore,
  accountId: EntityId,
  label: string,
) {
  const account = await accountStore.get(accountId)

  if (!account || account.archivedAt || account.deletedAt) {
    throw new RepositoryError(`${label} account is not available.`)
  }

  return account
}

async function requireActiveCategory(
  categoryStore: CategoryStore,
  categoryId: EntityId,
  expectedType: Exclude<TransactionType, 'transfer'>,
) {
  const category = await categoryStore.get(categoryId)

  if (!category || category.archivedAt || category.deletedAt) {
    throw new RepositoryError('Selected category is not available.')
  }

  if (category.type !== expectedType) {
    throw new RepositoryError(`Selected category must be ${expectedType}.`)
  }

  return category
}

async function validateTransactionForSave(
  transaction: Transaction,
  accountStore: AccountStore,
  categoryStore: CategoryStore,
) {
  assertPositiveAmount(transaction.amount)
  assertDate(transaction.date)

  if (transaction.type === 'income') {
    await requireActiveCategory(
      categoryStore,
      requireField(transaction.categoryId, 'Income category is required.'),
      'income',
    )
    await requireActiveAccount(
      accountStore,
      requireField(transaction.toAccountId, 'Income destination account is required.'),
      'Destination',
    )
    return
  }

  if (transaction.type === 'expense') {
    await requireActiveCategory(
      categoryStore,
      requireField(transaction.categoryId, 'Expense category is required.'),
      'expense',
    )
    await requireActiveAccount(
      accountStore,
      requireField(transaction.fromAccountId, 'Expense source account is required.'),
      'Source',
    )
    return
  }

  if (transaction.type === 'transfer') {
    if (transaction.linkedGoalId || transaction.linkedLoanId) {
      if (!transaction.fromAccountId && !transaction.toAccountId) {
        throw new RepositoryError('Linked movement account is required.')
      }

      const accountChecks: Promise<Account>[] = []

      if (transaction.fromAccountId) {
        accountChecks.push(
          requireActiveAccount(accountStore, transaction.fromAccountId, 'Source'),
        )
      }

      if (transaction.toAccountId) {
        accountChecks.push(
          requireActiveAccount(
            accountStore,
            transaction.toAccountId,
            'Destination',
          ),
        )
      }

      await Promise.all(accountChecks)
      return
    }

    const fromAccountId = requireField(
      transaction.fromAccountId,
      'Transfer source account is required.',
    )
    const toAccountId = requireField(
      transaction.toAccountId,
      'Transfer destination account is required.',
    )

    if (fromAccountId === toAccountId) {
      throw new RepositoryError('Transfer accounts must be different.')
    }

    await Promise.all([
      requireActiveAccount(accountStore, fromAccountId, 'Source'),
      requireActiveAccount(accountStore, toAccountId, 'Destination'),
    ])
    return
  }

  await requireActiveCategory(
    categoryStore,
    requireField(transaction.categoryId, 'Adjustment reason is required.'),
    'adjustment',
  )

  if (Boolean(transaction.fromAccountId) === Boolean(transaction.toAccountId)) {
    throw new RepositoryError(
      'Adjustment must either increase or decrease one account.',
    )
  }

  await requireActiveAccount(
    accountStore,
    requireField(
      transaction.toAccountId ?? transaction.fromAccountId,
      'Adjustment account is required.',
    ),
    'Adjustment',
  )
}

async function applyAccountBalanceImpacts(
  accountStore: AccountStore,
  impacts: AccountBalanceImpact[],
  now: string,
) {
  const updatedAccounts = new Map<EntityId, Account>()

  for (const impact of impacts) {
    const currentAccount =
      updatedAccounts.get(impact.accountId) ??
      (await accountStore.get(impact.accountId))

    if (!currentAccount) {
      throw new RepositoryRecordNotFoundError('Account', impact.accountId)
    }

    const currentBalance = currentAccount.currentBalance
    const balanceDelta =
      impact.direction === 'increase' ? impact.amount : -impact.amount

    updatedAccounts.set(impact.accountId, {
      ...currentAccount,
      currentBalance: currentBalance + balanceDelta,
      updatedAt: now,
    })
  }

  await Promise.all(
    [...updatedAccounts.values()].map((account) => accountStore.put(account)),
  )
}

export const transactionsRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const transactions = await db.getAll('transactions')

    return transactions.filter((transaction) =>
      isVisibleTransaction(transaction, options),
    )
  },

  async getById(id: EntityId, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const transaction = await db.get('transactions', id)

    if (!transaction || !isVisibleTransaction(transaction, options)) {
      return undefined
    }

    return transaction
  },

  async getByType(type: TransactionType, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const transactions = await db.getAllFromIndex(
      'transactions',
      'by-type',
      type,
    )

    return transactions.filter((transaction) =>
      isVisibleTransaction(transaction, options),
    )
  },

  async create(input: CreateTransactionInput) {
    const db = await getFinanceDb()
    const transaction = createTransactionRecord(input)
    const dbTransaction = db.transaction(
      ['accounts', 'categories', 'transactions'],
      'readwrite',
    )
    const accountStore = dbTransaction.objectStore('accounts')
    const categoryStore = dbTransaction.objectStore('categories')
    const transactionStore = dbTransaction.objectStore('transactions')
    const now = createTimestamp()

    await validateTransactionForSave(transaction, accountStore, categoryStore)

    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction,
    })

    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(transaction)
    await dbTransaction.done

    return transaction
  },

  async update(id: EntityId, input: UpdateTransactionInput) {
    const db = await getFinanceDb()
    const dbTransaction = db.transaction(
      ['accounts', 'categories', 'transactions'],
      'readwrite',
    )
    const accountStore = dbTransaction.objectStore('accounts')
    const categoryStore = dbTransaction.objectStore('categories')
    const transactionStore = dbTransaction.objectStore('transactions')
    const current = assertTransactionExists(await transactionStore.get(id), id)
    const updated = updateTransactionRecord(current, input)
    const now = createTimestamp()

    assertEditableStandaloneTransaction(current)
    await validateTransactionForSave(updated, accountStore, categoryStore)

    const impactPlan = buildTransactionImpactPlan({
      operation: 'edit',
      previousTransaction: current,
      transaction: updated,
    })

    await applyAccountBalanceImpacts(
      accountStore,
      [...impactPlan.reverse, ...impactPlan.apply],
      now,
    )
    await transactionStore.put(updated)
    await dbTransaction.done

    return updated
  },

  async archive(id: EntityId) {
    const db = await getFinanceDb()
    const dbTransaction = db.transaction(
      ['accounts', 'transactions'],
      'readwrite',
    )
    const accountStore = dbTransaction.objectStore('accounts')
    const transactionStore = dbTransaction.objectStore('transactions')
    const current = assertTransactionExists(await transactionStore.get(id), id)
    const now = createTimestamp()

    if (isLinkedTransaction(current)) {
      throw new RepositoryError(
        'Linked transactions cannot be archived from the Transactions page.',
      )
    }

    if (current.deletedAt) {
      await dbTransaction.done
      return current
    }

    const updated: Transaction = {
      ...current,
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    if (!current.archivedAt) {
      const impactPlan = buildTransactionImpactPlan({
        operation: 'delete',
        previousTransaction: current,
      })

      await applyAccountBalanceImpacts(accountStore, impactPlan.reverse, now)
    }

    await transactionStore.put(updated)
    await dbTransaction.done

    return updated
  },

  async deleteSoft(id: EntityId) {
    const db = await getFinanceDb()
    const dbTransaction = db.transaction(
      ['accounts', 'transactions'],
      'readwrite',
    )
    const accountStore = dbTransaction.objectStore('accounts')
    const transactionStore = dbTransaction.objectStore('transactions')
    const current = assertTransactionExists(await transactionStore.get(id), id)
    const now = createTimestamp()

    if (isLinkedTransaction(current)) {
      throw new RepositoryError(
        'Linked transactions cannot be deleted from the Transactions page.',
      )
    }

    if (current.deletedAt) {
      await dbTransaction.done
      return current
    }

    const updated: Transaction = {
      ...current,
      deletedAt: now,
      updatedAt: now,
    }

    if (!current.archivedAt) {
      const impactPlan = buildTransactionImpactPlan({
        operation: 'delete',
        previousTransaction: current,
      })

      await applyAccountBalanceImpacts(accountStore, impactPlan.reverse, now)
    }

    await transactionStore.put(updated)
    await dbTransaction.done

    return updated
  },
} satisfies TransactionsRepositoryContract
