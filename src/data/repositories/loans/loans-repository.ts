import { getFinanceDb } from '@/data/db/finance-db'
import type { LoansRepositoryContract } from '@/data/contracts/loans-contract'
import {
  getLoanMovementOutstandingDelta,
  withCurrentLoanStatus,
} from '@/data/domain/loan-calculations'
import type { Account } from '@/data/models/account'
import type { EntityId } from '@/data/models/common'
import { createRecordId, createTimestamp } from '@/data/models/common'
import type {
  CreateLoanInput,
  Loan,
  RecordLoanPaymentInput,
  UpdateLoanInput,
} from '@/data/models/loan'
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

type LoanStore = {
  get: (id: EntityId) => Promise<Loan | undefined>
  add: (loan: Loan) => Promise<unknown>
  put: (loan: Loan) => Promise<unknown>
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

function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function assertPositiveAmount(amount: number, label: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RepositoryError(`${label} must be greater than 0.`)
  }
}

function assertOptionalInterestRate(interestRate: number | undefined) {
  if (interestRate === undefined) {
    return
  }

  if (!Number.isFinite(interestRate) || interestRate < 0) {
    throw new RepositoryError('Interest rate cannot be negative.')
  }
}

function assertDate(date: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RepositoryError(`${label} is required.`)
  }
}

function isVisibleLoan(loan: Loan, options?: RepositoryListOptions) {
  if (!options?.includeDeleted && loan.deletedAt) {
    return false
  }

  if (!options?.includeArchived && loan.archivedAt) {
    return false
  }

  return true
}

function validateLoanInput(input: CreateLoanInput) {
  if (!input.name.trim()) {
    throw new RepositoryError('Loan name is required.')
  }

  assertPositiveAmount(input.principalAmount, 'Principal amount')
  assertOptionalInterestRate(input.interestRate)

  if (input.dueDate) {
    assertDate(input.dueDate, 'Due date')
  }

  if (input.type === 'given' && !input.sourceAccountId) {
    throw new RepositoryError('Loan given requires a source account.')
  }

  if (input.type === 'taken' && !input.receivingAccountId) {
    throw new RepositoryError('Loan taken requires a receiving account.')
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

async function validateLoanAccounts(
  accountStore: AccountStore,
  input: CreateLoanInput,
) {
  if (input.type === 'given') {
    await requireActiveAccount(
      accountStore,
      input.sourceAccountId ?? '',
      'Source',
    )
    return
  }

  await requireActiveAccount(
    accountStore,
    input.receivingAccountId ?? '',
    'Receiving',
  )
}

function createOpeningLoanTransaction(
  loanId: EntityId,
  input: CreateLoanInput,
  now: string,
): Transaction {
  const counterparty = normalizeOptional(input.counterparty)
  const notes = normalizeNotes(input.notes)
  const partyText = counterparty ? ` with ${counterparty}` : ''
  const noteText = notes ? `: ${notes}` : ''

  return {
    id: createRecordId(),
    type: 'transfer',
    amount: input.principalAmount,
    fromAccountId:
      input.type === 'given' ? input.sourceAccountId : undefined,
    toAccountId:
      input.type === 'taken' ? input.receivingAccountId : undefined,
    date: todayInputValue(),
    notes:
      input.type === 'given'
        ? `Loan given${partyText} - ${input.name}${noteText}`
        : `Loan taken${partyText} - ${input.name}${noteText}`,
    linkedLoanId: loanId,
    createdAt: now,
    updatedAt: now,
  }
}

function createLoanRecord(
  id: EntityId,
  input: CreateLoanInput,
  linkedTransactionId: EntityId,
  now: string,
): Loan {
  const base: Loan = {
    id,
    name: input.name.trim(),
    type: input.type,
    counterparty: normalizeOptional(input.counterparty),
    principalAmount: input.principalAmount,
    outstandingAmount: input.principalAmount,
    interestRate: input.interestRate,
    dueDate: normalizeOptional(input.dueDate),
    status: 'active',
    sourceAccountId: input.type === 'given' ? input.sourceAccountId : undefined,
    receivingAccountId:
      input.type === 'taken' ? input.receivingAccountId : undefined,
    linkedTransactionId,
    notes: normalizeNotes(input.notes),
    createdAt: now,
    updatedAt: now,
  }

  return withCurrentLoanStatus(base)
}

function mergeLoanInput(current: Loan, input: UpdateLoanInput): CreateLoanInput {
  return {
    name: input.name ?? current.name,
    type: input.type ?? current.type,
    counterparty:
      'counterparty' in input ? input.counterparty : current.counterparty,
    principalAmount: input.principalAmount ?? current.principalAmount,
    interestRate:
      'interestRate' in input ? input.interestRate : current.interestRate,
    dueDate: 'dueDate' in input ? input.dueDate : current.dueDate,
    sourceAccountId:
      'sourceAccountId' in input
        ? input.sourceAccountId
        : current.sourceAccountId,
    receivingAccountId:
      'receivingAccountId' in input
        ? input.receivingAccountId
        : current.receivingAccountId,
    notes: 'notes' in input ? input.notes : current.notes,
  }
}

function updateLoanRecord(current: Loan, input: UpdateLoanInput): Loan {
  const merged = mergeLoanInput(current, input)
  const updatedBase: Loan = {
    ...current,
    name: merged.name.trim(),
    type: merged.type,
    counterparty: normalizeOptional(merged.counterparty),
    principalAmount: merged.principalAmount,
    outstandingAmount:
      'principalAmount' in input &&
      input.principalAmount !== current.principalAmount
        ? merged.principalAmount
        : current.outstandingAmount,
    interestRate: merged.interestRate,
    dueDate: normalizeOptional(merged.dueDate),
    sourceAccountId:
      merged.type === 'given' ? merged.sourceAccountId : undefined,
    receivingAccountId:
      merged.type === 'taken' ? merged.receivingAccountId : undefined,
    notes: normalizeNotes(merged.notes),
    updatedAt: createTimestamp(),
  }

  return withCurrentLoanStatus(updatedBase)
}

function hasFinancialDetailChange(current: Loan, input: UpdateLoanInput) {
  return (
    ('type' in input && input.type !== current.type) ||
    ('principalAmount' in input &&
      input.principalAmount !== current.principalAmount) ||
    ('sourceAccountId' in input &&
      input.sourceAccountId !== current.sourceAccountId) ||
    ('receivingAccountId' in input &&
      input.receivingAccountId !== current.receivingAccountId)
  )
}

async function requireLoanFromStore(loanStore: LoanStore, id: EntityId) {
  const loan = await loanStore.get(id)

  if (!loan) {
    throw new RepositoryRecordNotFoundError('Loan', id)
  }

  return loan
}

function assertLoanCanChange(loan: Loan) {
  if (loan.archivedAt || loan.deletedAt || loan.status === 'archived') {
    throw new RepositoryError('Archived or deleted loans cannot be changed.')
  }
}

async function hasActiveLinkedLoanMovements(
  transactionStore: TransactionStore,
  loanId: EntityId,
) {
  const transactions = await transactionStore.getAll()

  return transactions.some(
    (transaction) =>
      transaction.linkedLoanId === loanId &&
      !transaction.archivedAt &&
      !transaction.deletedAt,
  )
}

function createLinkedLoanPaymentTransaction(
  loan: Loan,
  input: RecordLoanPaymentInput,
  now: string,
): Transaction {
  const notes = normalizeNotes(input.notes)
  const noteText = notes ? `: ${notes}` : ''

  return {
    id: createRecordId(),
    type: 'transfer',
    amount: input.amount,
    fromAccountId: loan.type === 'taken' ? input.accountId : undefined,
    toAccountId: loan.type === 'given' ? input.accountId : undefined,
    date: input.date,
    notes:
      loan.type === 'given'
        ? `Loan repayment received - ${loan.name}${noteText}`
        : `Loan repayment made - ${loan.name}${noteText}`,
    linkedLoanId: loan.id,
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

async function reverseLinkedLoanMovements(
  loan: Loan,
  accountStore: AccountStore,
  transactionStore: TransactionStore,
  now: string,
) {
  const transactions = await transactionStore.getAll()
  let reversedOutstandingDelta = 0

  for (const transaction of transactions) {
    if (transaction.linkedLoanId !== loan.id || transaction.deletedAt) {
      continue
    }

    if (!transaction.archivedAt) {
      const impactPlan = buildTransactionImpactPlan({
        operation: 'delete',
        previousTransaction: transaction,
      })

      await applyAccountBalanceImpacts(accountStore, impactPlan.reverse, now)
      reversedOutstandingDelta += getLoanMovementOutstandingDelta(
        loan.type,
        transaction,
      )
    }

    await transactionStore.put({
      ...transaction,
      deletedAt: transaction.deletedAt ?? now,
      updatedAt: now,
    })
  }

  return reversedOutstandingDelta
}

function clampOutstandingAmount(amount: number, principalAmount: number) {
  return Math.min(Math.max(amount, 0), principalAmount)
}

export const loansRepository = {
  async getAll(options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const loans = await db.getAll('loans')

    return loans
      .filter((loan) => isVisibleLoan(loan, options))
      .map(withCurrentLoanStatus)
  },

  async getById(id: EntityId, options?: RepositoryListOptions) {
    const db = await getFinanceDb()
    const loan = await db.get('loans', id)

    if (!loan || !isVisibleLoan(loan, options)) {
      return undefined
    }

    return withCurrentLoanStatus(loan)
  },

  async create(input: CreateLoanInput) {
    validateLoanInput(input)

    const db = await getFinanceDb()
    const transaction = db.transaction(['accounts', 'loans', 'transactions'], 'readwrite')
    const accountStore = transaction.objectStore('accounts')
    const loanStore = transaction.objectStore('loans')
    const transactionStore = transaction.objectStore('transactions')
    const now = createTimestamp()
    const loanId = createRecordId()
    const linkedTransaction = createOpeningLoanTransaction(loanId, input, now)
    const loan = createLoanRecord(loanId, input, linkedTransaction.id, now)
    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: linkedTransaction,
    })

    await validateLoanAccounts(accountStore, input)
    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(linkedTransaction)
    await loanStore.add(loan)
    await transaction.done

    return loan
  },

  async update(id: EntityId, input: UpdateLoanInput) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'loans', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const loanStore = transaction.objectStore('loans')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireLoanFromStore(loanStore, id)
    const merged = mergeLoanInput(current, input)

    assertLoanCanChange(current)

    if (
      hasFinancialDetailChange(current, input) &&
      (await hasActiveLinkedLoanMovements(transactionStore, current.id))
    ) {
      throw new RepositoryError(
        'This loan has linked movements. Reverse or delete linked movements before editing financial details.',
      )
    }

    validateLoanInput(merged)
    await validateLoanAccounts(accountStore, merged)

    const updated = updateLoanRecord(current, input)

    await loanStore.put(updated)
    await transaction.done

    return withCurrentLoanStatus(updated)
  },

  async archive(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'loans', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const loanStore = transaction.objectStore('loans')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireLoanFromStore(loanStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    const reversedOutstandingDelta = await reverseLinkedLoanMovements(
      current,
      accountStore,
      transactionStore,
      now,
    )
    const updated: Loan = {
      ...current,
      outstandingAmount: clampOutstandingAmount(
        current.outstandingAmount - reversedOutstandingDelta,
        current.principalAmount,
      ),
      status: 'archived',
      archivedAt: current.archivedAt ?? now,
      updatedAt: now,
    }

    await loanStore.put(updated)
    await transaction.done

    return updated
  },

  async deleteSoft(id: EntityId) {
    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'loans', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const loanStore = transaction.objectStore('loans')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireLoanFromStore(loanStore, id)
    const now = createTimestamp()

    if (current.deletedAt) {
      await transaction.done
      return current
    }

    const reversedOutstandingDelta = await reverseLinkedLoanMovements(
      current,
      accountStore,
      transactionStore,
      now,
    )
    const updated: Loan = {
      ...current,
      outstandingAmount: clampOutstandingAmount(
        current.outstandingAmount - reversedOutstandingDelta,
        current.principalAmount,
      ),
      status: 'archived',
      deletedAt: now,
      updatedAt: now,
    }

    await loanStore.put(updated)
    await transaction.done

    return updated
  },

  async recordPayment(id: EntityId, input: RecordLoanPaymentInput) {
    assertPositiveAmount(input.amount, 'Repayment amount')
    assertDate(input.date, 'Repayment date')

    if (!input.accountId) {
      throw new RepositoryError('Payment account is required.')
    }

    const db = await getFinanceDb()
    const transaction = db.transaction(
      ['accounts', 'loans', 'transactions'],
      'readwrite',
    )
    const accountStore = transaction.objectStore('accounts')
    const loanStore = transaction.objectStore('loans')
    const transactionStore = transaction.objectStore('transactions')
    const current = await requireLoanFromStore(loanStore, id)
    const now = createTimestamp()

    assertLoanCanChange(current)

    if (current.outstandingAmount <= 0) {
      throw new RepositoryError('Loan is already completed.')
    }

    if (input.amount > current.outstandingAmount) {
      throw new RepositoryError('Repayment cannot exceed outstanding amount.')
    }

    await requireActiveAccount(
      accountStore,
      input.accountId,
      current.type === 'given' ? 'Receiving' : 'Payment',
    )

    const linkedTransaction = createLinkedLoanPaymentTransaction(
      current,
      input,
      now,
    )
    const impactPlan = buildTransactionImpactPlan({
      operation: 'create',
      transaction: linkedTransaction,
    })
    const updatedBase: Loan = {
      ...current,
      outstandingAmount: current.outstandingAmount - input.amount,
      updatedAt: now,
    }
    const updated = withCurrentLoanStatus(updatedBase)

    await applyAccountBalanceImpacts(accountStore, impactPlan.apply, now)
    await transactionStore.add(linkedTransaction)
    await loanStore.put(updated)
    await transaction.done

    return {
      loan: updated,
      transaction: linkedTransaction,
    }
  },
} satisfies LoansRepositoryContract
