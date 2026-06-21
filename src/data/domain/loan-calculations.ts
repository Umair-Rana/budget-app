import type { Loan, LoanStatus, LoanType } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import type { LoanFilterValue } from '@/data/display/loan-options'

export type LoanSummary = {
  totalReceivable: number
  totalPayable: number
  activeLoans: number
  completedLoans: number
}

function todayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getLoanCurrentStatus(loan: Loan): LoanStatus {
  if (loan.archivedAt || loan.status === 'archived') {
    return 'archived'
  }

  if (loan.outstandingAmount <= 0) {
    return 'completed'
  }

  if (loan.dueDate && loan.dueDate < todayDateString()) {
    return 'overdue'
  }

  if (loan.outstandingAmount < loan.principalAmount) {
    return 'partially_paid'
  }

  return 'active'
}

export function withCurrentLoanStatus(loan: Loan): Loan {
  return {
    ...loan,
    status: getLoanCurrentStatus(loan),
  }
}

export function getLoanAmountRepaid(loan: Loan) {
  return Math.max(loan.principalAmount - loan.outstandingAmount, 0)
}

export function getLoanProgressPercent(loan: Loan) {
  if (loan.principalAmount <= 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round((getLoanAmountRepaid(loan) / loan.principalAmount) * 100),
  )
}

export function getLoanSummary(loans: Loan[]): LoanSummary {
  return loans.reduce<LoanSummary>(
    (summary, loan) => {
      const status = getLoanCurrentStatus(loan)

      if (loan.type === 'given') {
        summary.totalReceivable += loan.outstandingAmount
      } else {
        summary.totalPayable += loan.outstandingAmount
      }

      if (status === 'completed') {
        summary.completedLoans += 1
      } else if (status !== 'archived') {
        summary.activeLoans += 1
      }

      return summary
    },
    {
      totalReceivable: 0,
      totalPayable: 0,
      activeLoans: 0,
      completedLoans: 0,
    },
  )
}

export function filterLoansByType(loans: Loan[], filter: LoanFilterValue) {
  if (filter === 'all') {
    return loans
  }

  return loans.filter((loan) => loan.type === filter)
}

export function sortLoans(loans: Loan[]) {
  const statusRank: Record<LoanStatus, number> = {
    overdue: 0,
    active: 1,
    partially_paid: 2,
    completed: 3,
    archived: 4,
  }

  return [...loans].sort((first, second) => {
    const statusDifference =
      statusRank[getLoanCurrentStatus(first)] -
      statusRank[getLoanCurrentStatus(second)]

    if (statusDifference !== 0) {
      return statusDifference
    }

    if (first.dueDate && second.dueDate) {
      return first.dueDate.localeCompare(second.dueDate)
    }

    if (first.dueDate) {
      return -1
    }

    if (second.dueDate) {
      return 1
    }

    return first.name.localeCompare(second.name)
  })
}

export function hasActiveLinkedLoanMovements(
  loan: Loan,
  transactions: Transaction[],
) {
  return transactions.some(
    (transaction) =>
      transaction.linkedLoanId === loan.id &&
      !transaction.archivedAt &&
      !transaction.deletedAt,
  )
}

export function getLoanMovementOutstandingDelta(
  loanType: LoanType,
  transaction: Transaction,
) {
  if (!transaction.linkedLoanId || transaction.type !== 'transfer') {
    return 0
  }

  if (loanType === 'given') {
    if (transaction.fromAccountId && !transaction.toAccountId) {
      return transaction.amount
    }

    if (transaction.toAccountId && !transaction.fromAccountId) {
      return -transaction.amount
    }
  }

  if (transaction.toAccountId && !transaction.fromAccountId) {
    return transaction.amount
  }

  if (transaction.fromAccountId && !transaction.toAccountId) {
    return -transaction.amount
  }

  return 0
}
