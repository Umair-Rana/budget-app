import { getFinanceDb } from '@/data/db/finance-db'
import type { GoalsRepositoryContract } from '@/data/contracts/goals-contract'
import type { Account } from '@/data/models/account'
import type { EntityId } from '@/data/models/common'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  AddGoalContributionInput,
  CreateGoalInput,
  Goal,
  UpdateGoalInput,
  WithdrawFromGoalInput,
} from '@/data/models/goal'
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

type GoalStore = {
  get: (id: EntityId) => Promise<Goal | undefined>
  add: (goal: Goal) => Promise<unknown>
  put: (goal: Goal) => Promise<unknown>
}

type TransactionStore = {
  getAll: () => Promise<Transaction[]>
  add: (transaction: Transaction) => Promise<unknown>
  put: (transaction: Transaction) => Promise<unknown>
}

function normalizeNotes(notes: string | undefined) {
  const normalized = notes?.trim()

  return normalized ? normalized : undefined
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim()

  return normalized ? normalized : undefined
}

function assertPositiveAmount(amount: number, label: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RepositoryError(`${label} must be greater than 0.`)
  }
}

function assertNonNegativeAmount(amount: number, label: string) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RepositoryError(`${label} cannot be negative.`)
  }
}

function assertDate(date: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RepositoryError(`${label} is required.`)
  }
}

function goalStatusForAmount(goal: Pick<Goal, 'currentAmount' | 'targetAmount'>) {
  return goal.currentAmount >= goal.targetAmount ? 'completed' : 'active'
}

function withCurrentGoalStatus(goal: Goal): Goal {
  if (goal.archivedAt || goal.status === 'archived') {
    return {
      ...goal,
      status: 'archived',
    }
  }

  return {
    ...goal,
    status: goalStatusForAmount(goal),
  }
}

function isVisibleGoal(goal: Goal, options?: RepositoryListOptions) {
  if (!options?.includeDeleted && goal.deletedAt) {
    return false
  }

  if (!options?.includeArchived && goal.archivedAt) {
    return false
  }

  return true
}

function validateGoalInput(input: CreateGoalInput) {
  if (!input.name.trim()) {
    throw new RepositoryError('Goal name is required.')
  }

  assertPositiveAmount(input.targetAmount, 'Target amount')
  assertNonNegativeAmount(input.currentAmount, 'Current amount')

  if (input.currentAmount > input.targetAmount) {
    throw new RepositoryError('Current amount cannot exceed target amount.')
  }

  if (input.targetDate) {
    assertDate(input.targetDate, 'Target date')
  }

  if (!input.priority) {
    throw new RepositoryError('Priority is required.')
  }
}

function createGoalRecord(input: CreateGoalInput): Goal {
  const now = createTimestamp()
  const goalBase = {
    id: createRecordId(),
    name: input.name.trim(),
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount,
    targetDate: normalizeOptional(input.targetDate),
    priority: input.priority,
    icon: normalizeOptional(input.icon),
    color: normalizeOptional(input.color),
    notes: normalizeNotes(input.notes),
    createdAt: now,
    updatedAt: now,
  }

  return {
    ...goalBase,
    status: goalStatusForAmount(goalBase),
  }
}

function mergeGoalInput(current: Goal, input: UpdateGoalInput): CreateGoalInput {
  return {
    name: input.name ?? current.name,
    targetAmount: input.targetAmount ?? current.targetAmount,
    currentAmount: input.currentAmount ?? current.currentAmount,
    targetDate: 'targetDate' in input ? input.targetDate : current.targetDate,
    priority: input.priority ?? current.priority,
    icon: 'icon' in input ? input.icon : current.icon,
    color: 'color' in input ? input.color : current.color,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function updateGoalRecord(current: Goal, input: UpdateGoalInput): Goal {
  const merged = mergeGoalInput(current, input)
  const updatedBase = {
    ...current,
    name: merged.name.trim(),
    targetAmount: merged.targetAmount,
    currentAmount: merged.currentAmount,
    targetDate: normalizeOptional(merged.targetDate),
    priority: merged.priority,
    icon: normalizeOptional(merged.icon),
    color: normalizeOptional(merged.color),
    notes: normalizeNotes(merged.notes),
    updatedAt: createTimestamp(),
  }

  return {
    ...updatedBase,
    status: current.status === 'archived' ? 'archived' : goalStatusForAmount(updatedBase),
  }
}

async function requireGoalFromStore(goalStore: GoalStore, id: EntityId) {
  const goal = await goalStore.get(id)

  if (!goal) {
    throw new RepositoryRecordNotFoundError('Goal', id)
  }

  return goal
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

function assertGoalCanChange(goal: Goal) {
  if (goal.archivedAt || goal.deletedAt || goal.status === 'archived') {
    throw new RepositoryError('Archived or deleted goals cannot be changed.')
  }
}

function validateContribution(goal: Goal, input: AddGoalContributionInput) {
  assertPositiveAmount(input.amount, 'Contribution amount')
  assertDate(input.date, 'Contribution date')

  if (!input.sourceAccountId) {
    throw new RepositoryError('Source account is required.')
  }

  if (goal.currentAmount + input.amount > goal.targetAmount) {
    throw new RepositoryError('Contribution cannot exceed the goal target.')
  }
}

function validateWithdrawal(goal: Goal, input: WithdrawFromGoalInput) {
  assertPositiveAmount(input.amount, 'Withdrawal amount')
  assertDate(input.date, 'Withdrawal date')

  if (!input.destinationAccountId) {
    throw new RepositoryError('Destination account is required.')
  }

  if (input.amount > goal.currentAmount) {
    throw new RepositoryError('Withdrawal cannot exceed the saved goal amount.')
  }
}

function createLinkedGoalContributionTransaction(
  goal: Goal,
  input: AddGoalContributionInput,
  now: string,
): Transaction {
  const notes = normalizeNotes(input.notes)

  return {
    id: createRecordId(),
    type: 'transfer',
    amount: input.amount,
    fromAccountId: input.sourceAccountId,
    date: input.date,
    notes: notes
      ? `Goal contribution to ${goal.name}: ${notes}`
      : `Goal contribution to ${goal.name}`,
    linkedGoalId: goal.id,
    createdAt: now,
    updatedAt: now,
  }
}

function createLinkedGoalWithdrawalTransaction(
  goal: Goal,
  input: WithdrawFromGoalInput,
  now: string,
): Transaction {
  const notes = normalizeNotes(input.notes)

  return {
    id: createRecordId(),
    type: 'transfer',
    amount: input.amount,
    toAccountId: input.destinationAccountId,
    date: input.date,
    notes: notes
      ? `Goal withdrawal from ${goal.name}: ${notes}`
      : `Goal withdrawal from ${goal.name}`,
    linkedGoalId: goal.id,
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

function getGoalMovementDelta(transaction: Transaction) {
  if (!transaction.linkedGoalId || transaction.type !== 'transfer') {
    return 0
  }

  if (transaction.fromAccountId && !transaction.toAccountId) {
    return transaction.amount
  }

  if (transaction.toAccountId && !transaction.fromAccountId) {
    return -transaction.amount
  }

  return 0
}

async function hasActiveLinkedGoalMovements(
  transactionStore: TransactionStore,
  goalId: EntityId,
) {
  const transactions = await transactionStore.getAll()

  return transactions.some(
    (transaction) =>
      transaction.linkedGoalId === goalId &&
      !transaction.archivedAt &&
      !transaction.deletedAt,
  )
}

async function reverseLinkedGoalMovements(
  goal: Goal,
  accountStore: AccountStore,
  transactionStore: TransactionStore,
  now: string,
) {
  const transactions = await transactionStore.getAll()
  let reversedGoalDelta = 0

  for (const transaction of transactions) {
    if (transaction.linkedGoalId !== goal.id || transaction.deletedAt) {
      continue
    }

    if (!transaction.archivedAt) {
      const impactPlan = buildTransactionImpactPlan({
        operation: 'delete',
        previousTransaction: transaction,
      })

      await applyAccountBalanceImpacts(accountStore, impactPlan.reverse, now)
      reversedGoalDelta += getGoalMovementDelta(transaction)
    }

    await transactionStore.put({
      ...transaction,
      deletedAt: transaction.deletedAt ?? now,
      updatedAt: now,
    })
  }

  return reversedGoalDelta
}

function clampGoalAmount(amount: number, targetAmount: number) {
  return Math.min(Math.max(amount, 0), targetAmount)
}

export const goalsRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const goals = await db.getAll('goals')

    return goals
      .filter((goal) => isVisibleGoal(goal, options))
      .map(withCurrentGoalStatus)
  },

  async getById(id: EntityId, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const goal = await db.get('goals', id)

    if (!goal || !isVisibleGoal(goal, options)) {
      return undefined
    }

    return withCurrentGoalStatus(goal)
  },

  async create(input: CreateGoalInput) {
    validateGoalInput(input)

    const db = await getFinanceDb()
    const goal = createGoalRecord(input)

    await db.add('goals', goal)

    return goal
  },

  async update(id: EntityId, input: UpdateGoalInput) {
    const db = await getFinanceDb()
    const transaction = db.transaction(['goals', 'transactions'], 'readwrite')
    const goalStore = transaction.objectStore('goals')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireGoalFromStore(goalStore, id)

    assertGoalCanChange(current)

    if (
      'currentAmount' in input &&
      input.currentAmount !== current.currentAmount &&
      (await hasActiveLinkedGoalMovements(transactionStore, current.id))
    ) {
      throw new RepositoryError(
        'Current amount is controlled by linked goal movements.',
      )
    }

    validateGoalInput(mergeGoalInput(current, input))

    const updated = updateGoalRecord(current, input)

    await goalStore.put(updated)
    await transaction.done

    return withCurrentGoalStatus(updated)
  },

  async archive(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'goals', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const goalStore = transaction.objectStore('goals')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireGoalFromStore(goalStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    const reversedGoalDelta = await reverseLinkedGoalMovements(
      current,
      accountStore,
      transactionStore,
      now,
    )
    const updated: Goal = {
      ...current,
      currentAmount: clampGoalAmount(
        current.currentAmount - reversedGoalDelta,
        current.targetAmount,
      ),
      status: 'archived',
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await goalStore.put(updated)
    await transaction.done

    return updated
  },

  async deleteSoft(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'goals', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const goalStore = transaction.objectStore('goals')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireGoalFromStore(goalStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    const reversedGoalDelta = await reverseLinkedGoalMovements(
      current,
      accountStore,
      transactionStore,
      now,
    )
    const updated: Goal = {
      ...current,
      currentAmount: clampGoalAmount(
        current.currentAmount - reversedGoalDelta,
        current.targetAmount,
      ),
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
    }

    await goalStore.put(updated)
    await transaction.done

    return updated
  },

  async addContribution(id: EntityId, input: AddGoalContributionInput) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'goals', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const goalStore = transaction.objectStore('goals')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireGoalFromStore(goalStore, id)
    const now = createTimestamp()

    assertGoalCanChange(current)
    validateContribution(current, input)
    await requireActiveAccount(accountStore, input.sourceAccountId, 'Source')

    const linkedTransaction = createLinkedGoalContributionTransaction(
      current,
      input,
      now,
    )
    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: linkedTransaction,
    })
    const updatedBase: Goal = {
      ...current,
      currentAmount: current.currentAmount + input.amount,
      updatedAt: now,
    }
    const updated: Goal = {
      ...updatedBase,
      status: goalStatusForAmount(updatedBase),
    }

    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(linkedTransaction)
    await goalStore.put(updated)
    await transaction.done

    return {
      goal: withCurrentGoalStatus(updated),
      transaction: linkedTransaction,
    }
  },

  async withdraw(id: EntityId, input: WithdrawFromGoalInput) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'goals', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const goalStore = transaction.objectStore('goals')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireGoalFromStore(goalStore, id)
    const now = createTimestamp()

    assertGoalCanChange(current)
    validateWithdrawal(current, input)
    await requireActiveAccount(
      accountStore,
      input.destinationAccountId,
      'Destination',
    )

    const linkedTransaction = createLinkedGoalWithdrawalTransaction(
      current,
      input,
      now,
    )
    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: linkedTransaction,
    })
    const updatedBase: Goal = {
      ...current,
      currentAmount: current.currentAmount - input.amount,
      updatedAt: now,
    }
    const updated: Goal = {
      ...updatedBase,
      status: goalStatusForAmount(updatedBase),
    }

    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(linkedTransaction)
    await goalStore.put(updated)
    await transaction.done

    return {
      goal: withCurrentGoalStatus(updated),
      transaction: linkedTransaction,
    }
  },
} satisfies GoalsRepositoryContract
