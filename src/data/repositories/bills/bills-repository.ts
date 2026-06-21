import { getFinanceDb } from '@/data/db/finance-db'
import type { BillsRepositoryContract } from '@/data/contracts/bills-contract'
import type { Account } from '@/data/models/account'
import type {
  Bill,
  CreateBillInput,
  MarkBillPaidInput,
  UpdateBillInput,
} from '@/data/models/bill'
import type { Category } from '@/data/models/category'
import type { EntityId } from '@/data/models/common'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type { Transaction } from '@/data/models/transaction'
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

type TransactionStore = {
  get: (id: EntityId) => Promise<Transaction | undefined>
  add: (transaction: Transaction) => Promise<unknown>
  put: (transaction: Transaction) => Promise<unknown>
}

type BillStore = {
  get: (id: EntityId) => Promise<Bill | undefined>
  add: (bill: Bill) => Promise<unknown>
  put: (bill: Bill) => Promise<unknown>
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function assertPositiveAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RepositoryError('Bill amount must be greater than 0.')
  }
}

function assertDate(date: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RepositoryError(`${label} is required.`)
  }
}

function todayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function daysFromToday(date: string) {
  const today = new Date(`${todayDateString()}T00:00:00`)
  const target = new Date(`${date}T00:00:00`)
  const dayMs = 24 * 60 * 60 * 1000

  return Math.floor((target.getTime() - today.getTime()) / dayMs)
}

function unpaidStatusForDueDate(dueDate: string): Bill['status'] {
  const daysUntilDue = daysFromToday(dueDate)

  if (daysUntilDue < 0) {
    return 'overdue'
  }

  if (daysUntilDue <= 2) {
    return 'pending'
  }

  return 'upcoming'
}

function withCurrentBillStatus(bill: Bill): Bill {
  if (bill.status === 'paid') {
    return bill
  }

  return {
    ...bill,
    status: unpaidStatusForDueDate(bill.dueDate),
  }
}

function isVisibleBill(bill: Bill, options?: RepositoryListOptions) {
  if (!options?.includeDeleted && bill.deletedAt) {
    return false
  }

  if (!options?.includeArchived && bill.archivedAt) {
    return false
  }

  return true
}

async function requireBillFromStore(billStore: BillStore, id: EntityId) {
  const bill = await billStore.get(id)

  if (!bill) {
    throw new RepositoryRecordNotFoundError('Bill', id)
  }

  return bill
}

async function requireActiveExpenseCategory(
  categoryStore: CategoryStore,
  categoryId: EntityId,
) {
  const category = await categoryStore.get(categoryId)

  if (!category || category.archivedAt || category.deletedAt) {
    throw new RepositoryError('Selected expense category is not available.')
  }

  if (category.type !== 'expense') {
    throw new RepositoryError('Bill category must be an expense category.')
  }

  return category
}

async function requireActiveAccount(
  accountStore: AccountStore,
  accountId: EntityId,
) {
  const account = await accountStore.get(accountId)

  if (!account || account.archivedAt || account.deletedAt) {
    throw new RepositoryError('Payment account is not available.')
  }

  return account
}

function validateBillInput(input: CreateBillInput) {
  if (!input.name.trim()) {
    throw new RepositoryError('Bill name is required.')
  }

  assertPositiveAmount(input.amount)
  assertDate(input.dueDate, 'Due date')

  if (!input.categoryId) {
    throw new RepositoryError('Expense category is required.')
  }

  if (!input.frequency) {
    throw new RepositoryError('Frequency is required.')
  }
}

function createBillRecord(input: CreateBillInput): Bill {
  const now = createTimestamp()

  return {
    id: createRecordId(),
    name: input.name.trim(),
    amount: input.amount,
    categoryId: input.categoryId,
    dueDate: input.dueDate,
    status: unpaidStatusForDueDate(input.dueDate),
    frequency: input.frequency,
    notes: normalizeNotes(input.notes),
    createdAt: now,
    updatedAt: now,
  }
}

function mergeBillInput(current: Bill, input: UpdateBillInput): CreateBillInput {
  return {
    name: input.name ?? current.name,
    amount: input.amount ?? current.amount,
    categoryId: input.categoryId ?? current.categoryId,
    dueDate: input.dueDate ?? current.dueDate,
    frequency: input.frequency ?? current.frequency,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function updateBillRecord(current: Bill, input: UpdateBillInput): Bill {
  const merged = mergeBillInput(current, input)

  return {
    ...current,
    name: merged.name.trim(),
    amount: merged.amount,
    categoryId: merged.categoryId,
    dueDate: merged.dueDate,
    frequency: merged.frequency,
    notes: normalizeNotes(merged.notes),
    status: current.status === 'paid' ? 'paid' : unpaidStatusForDueDate(merged.dueDate),
    updatedAt: createTimestamp(),
  }
}

function assertBillCanBeEdited(current: Bill, input: UpdateBillInput) {
  if (current.status !== 'paid') {
    return
  }

  const paymentSensitiveChange =
    ('amount' in input && input.amount !== current.amount) ||
    ('categoryId' in input && input.categoryId !== current.categoryId) ||
    ('dueDate' in input && input.dueDate !== current.dueDate)

  if (paymentSensitiveChange) {
    throw new RepositoryError(
      'Unmark as unpaid before editing payment details.',
    )
  }
}

function createLinkedBillTransaction(
  bill: Bill,
  payment: MarkBillPaidInput,
): Transaction {
  const now = createTimestamp()
  const notes = normalizeNotes(payment.notes) ?? normalizeNotes(bill.notes)

  return {
    id: createRecordId(),
    type: 'expense',
    amount: bill.amount,
    categoryId: bill.categoryId,
    fromAccountId: payment.paymentAccountId,
    date: payment.paymentDate,
    notes: notes ? `${bill.name}: ${notes}` : bill.name,
    linkedBillId: bill.id,
    createdAt: now,
    updatedAt: now,
  }
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

    const balanceDelta =
      impact.direction === 'increase' ? impact.amount : -impact.amount

    updatedAccounts.set(impact.accountId, {
      ...currentAccount,
      currentBalance: currentAccount.currentBalance + balanceDelta,
      updatedAt: now,
    })
  }

  await Promise.all(
    [...updatedAccounts.values()].map((account) => accountStore.put(account)),
  )
}

async function reverseLinkedPaymentIfNeeded(
  bill: Bill,
  accountStore: AccountStore,
  transactionStore: TransactionStore,
  now: string,
) {
  if (bill.status !== 'paid' || !bill.linkedTransactionId) {
    return
  }

  const linkedTransaction = await transactionStore.get(bill.linkedTransactionId)

  if (!linkedTransaction || linkedTransaction.deletedAt) {
    return
  }

  if (!linkedTransaction.archivedAt) {
    const impactPlan = buildTransactionImpactPlan({
      operation: 'delete',
      previousTransaction: linkedTransaction,
    })

    await applyAccountBalanceImpacts(accountStore, impactPlan.reverse, now)
  }

  await transactionStore.put({
    ...linkedTransaction,
    deletedAt: linkedTransaction.deletedAt ?? now,
    updatedAt: now,
  })
}

export const billsRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const bills = await db.getAll('bills')

    return bills
      .filter((bill) => isVisibleBill(bill, options))
      .map(withCurrentBillStatus)
  },

  async getById(id: EntityId, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const bill = await db.get('bills', id)

    if (!bill || !isVisibleBill(bill, options)) {
      return undefined
    }

    return withCurrentBillStatus(bill)
  },

  async create(input: CreateBillInput) {
    validateBillInput(input)

    const db = await getFinanceDb()
    const transaction = db.transaction(['bills', 'categories'], 'readwrite')
    const billStore = transaction.objectStore('bills')
    const categoryStore = transaction.objectStore('categories')
    const bill = createBillRecord(input)

    await requireActiveExpenseCategory(categoryStore, bill.categoryId)
    await billStore.add(bill)
    await transaction.done

    return bill
  },

  async update(id: EntityId, input: UpdateBillInput) {
    const db = await getFinanceDb()
    const transaction = db.transaction(['bills', 'categories'], 'readwrite')
    const billStore = transaction.objectStore('bills')
    const categoryStore = transaction.objectStore('categories')
    const current = await requireBillFromStore(billStore, id)

    if (current.archivedAt || current.deletedAt) {
      throw new RepositoryError('Archived or deleted bills cannot be edited.')
    }

    assertBillCanBeEdited(current, input)

    const updated = updateBillRecord(current, input)

    validateBillInput(mergeBillInput(current, input))
    await requireActiveExpenseCategory(categoryStore, updated.categoryId)
    await billStore.put(updated)
    await transaction.done

    return withCurrentBillStatus(updated)
  },

  async archive(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(['accounts', 'bills', 'transactions'], 'readwrite')
    const accountStore = transaction.objectStore('accounts')
    const billStore = transaction.objectStore('bills')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireBillFromStore(billStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    await reverseLinkedPaymentIfNeeded(
      current,
      accountStore,
      transactionStore,
      now,
    )

    const updated: Bill = {
      ...current,
      status: current.status === 'paid' ? unpaidStatusForDueDate(current.dueDate) : current.status,
      paymentAccountId: undefined,
      linkedTransactionId: undefined,
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await billStore.put(updated)
    await transaction.done

    return withCurrentBillStatus(updated)
  },

  async deleteSoft(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(['accounts', 'bills', 'transactions'], 'readwrite')
    const accountStore = transaction.objectStore('accounts')
    const billStore = transaction.objectStore('bills')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireBillFromStore(billStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    await reverseLinkedPaymentIfNeeded(
      current,
      accountStore,
      transactionStore,
      now,
    )

    const updated: Bill = {
      ...current,
      status: current.status === 'paid' ? unpaidStatusForDueDate(current.dueDate) : current.status,
      paymentAccountId: undefined,
      linkedTransactionId: undefined,
      deletedAt: now,
      updatedAt: now,
    }

    await billStore.put(updated)
    await transaction.done

    return withCurrentBillStatus(updated)
  },

  async markPaid(id: EntityId, input: MarkBillPaidInput) {
    assertDate(input.paymentDate, 'Payment date')

    if (!input.paymentAccountId) {
      throw new RepositoryError('Payment account is required.')
    }

    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'bills', 'categories', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const billStore = transaction.objectStore('bills')
    const categoryStore = transaction.objectStore('categories')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireBillFromStore(billStore, id)
    const now = createTimestamp()

    if (current.archivedAt || current.deletedAt) {
      throw new RepositoryError('Archived or deleted bills cannot be paid.')
    }

    if (current.status === 'paid') {
      throw new RepositoryError('Bill is already paid.')
    }

    await requireActiveExpenseCategory(categoryStore, current.categoryId)
    await requireActiveAccount(accountStore, input.paymentAccountId)

    const linkedTransaction = createLinkedBillTransaction(current, input)
    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: linkedTransaction,
    })

    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(linkedTransaction)

    const updated: Bill = {
      ...current,
      status: 'paid',
      paymentAccountId: input.paymentAccountId,
      linkedTransactionId: linkedTransaction.id,
      updatedAt: now,
    }

    await billStore.put(updated)
    await transaction.done

    return updated
  },

  async markUnpaid(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(['accounts', 'bills', 'transactions'], 'readwrite')
    const accountStore = transaction.objectStore('accounts')
    const billStore = transaction.objectStore('bills')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireBillFromStore(billStore, id)
    const now = createTimestamp()

    if (current.status !== 'paid') {
      await transaction.done
      return withCurrentBillStatus(current)
    }

    await reverseLinkedPaymentIfNeeded(
      current,
      accountStore,
      transactionStore,
      now,
    )

    const updated: Bill = {
      ...current,
      status: unpaidStatusForDueDate(current.dueDate),
      paymentAccountId: undefined,
      linkedTransactionId: undefined,
      updatedAt: now,
    }

    await billStore.put(updated)
    await transaction.done

    return withCurrentBillStatus(updated)
  },
} satisfies BillsRepositoryContract
