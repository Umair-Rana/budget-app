import type { Account } from '@/data/models/account'
import type { Bill } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import { getTransactionSortTimestamp } from '@/data/domain/transaction-datetime'
import {
  createPlannerWorkspace,
  formatBudgetMonth,
  getPlannerBudgetTotals,
  type BudgetUsageStatus,
} from '@/data/planner/planner-selectors'
import { formatDisplayDate, formatPkr } from '@/lib/formatting'

export type { BudgetUsageStatus } from '@/data/planner/planner-selectors'

export type ReportSummaryTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export type ReportSummaryMetric = {
  key: string
  label: string
  value: string
  helper: string
  tone: ReportSummaryTone
}

export type ReportCashflowBar = {
  label: string
  value: number
  valueText: string
  progressPercent: number
  tone: 'success' | 'warning'
}

export type ReportBudgetRow = {
  id: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  plannedAmountText: string
  actualAmountText: string
  remainingAmountText: string
  usagePercent: number
  progressPercent: number
  status: BudgetUsageStatus
  statusLabel: string
}

export type ReportUnplannedBudgetRow = {
  id: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  actualAmountText: string
}

export type ReportCategorySpendingRow = {
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  amount: number
  amountText: string
  percent: number
  percentText: string
  progressPercent: number
}

export type ReportCategorySpendingChartRow = {
  id: string
  name: string
  amount: number
  amountText: string
  color: string
  percent: number
  percentText: string
}

export type ReportBillPaidRow = {
  id: string
  billName: string
  amountText: string
  paidDateLabel: string
  paymentAccountName: string
  categoryName: string
}

export type ReportGoalActivityRow = {
  id: string
  goalName: string
  movementLabel: 'Contribution' | 'Withdrawal'
  amountText: string
  dateLabel: string
  accountName: string
  notes?: string
}

export type ReportGoalActivitySummary = {
  totalContributions: number
  totalContributionsText: string
  totalWithdrawals: number
  totalWithdrawalsText: string
}

export type ReportLoanActivityRow = {
  id: string
  loanName: string
  loanTypeLabel: 'Given' | 'Taken'
  movementLabel:
    | 'Loan Given'
    | 'Loan Taken'
    | 'Repayment Received'
    | 'Repayment Made'
    | 'Loan Movement'
  amountText: string
  dateLabel: string
  accountName: string
  counterparty?: string
}

export type ReportLoanActivitySummary = {
  totalRepaymentsReceived: number
  totalRepaymentsReceivedText: string
  totalRepaymentsMade: number
  totalRepaymentsMadeText: string
  totalLoanGiven: number
  totalLoanGivenText: string
  totalLoanTaken: number
  totalLoanTakenText: string
}

export type MonthlyReportData = {
  month: string
  monthLabel: string
  summaryMetrics: ReportSummaryMetric[]
  primarySummaryMetrics: ReportSummaryMetric[]
  secondarySummaryMetrics: ReportSummaryMetric[]
  cashflowBars: ReportCashflowBar[]
  budgetRows: ReportBudgetRow[]
  plannedBudgetRows: ReportBudgetRow[]
  unplannedBudgetRows: ReportUnplannedBudgetRow[]
  budgetFallback: boolean
  categorySpendingRows: ReportCategorySpendingRow[]
  categorySpendingChartRows: ReportCategorySpendingChartRow[]
  billsPaidRows: ReportBillPaidRow[]
  goalActivityRows: ReportGoalActivityRow[]
  goalActivitySummary: ReportGoalActivitySummary
  loanActivityRows: ReportLoanActivityRow[]
  loanActivitySummary: ReportLoanActivitySummary
  hasMonthlyActivity: boolean
}

export type MonthlyReportSourceData = {
  accounts: Account[]
  bills: Bill[]
  budgets: BudgetAllocation[]
  categories: Category[]
  goals: Goal[]
  loans: Loan[]
  transactions: Transaction[]
}

function isVisibleRecord(record: { archivedAt?: string; deletedAt?: string }) {
  return !record.archivedAt && !record.deletedAt
}

function createRecordMap<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]))
}

function isSelectedMonthTransaction(transaction: Transaction, month: string) {
  return isVisibleRecord(transaction) && transaction.date.startsWith(month)
}

function hasLinkedNonCashflowMovement(transaction: Transaction) {
  return Boolean(transaction.linkedGoalId || transaction.linkedLoanId)
}

function isNormalIncomeTransaction(transaction: Transaction, month: string) {
  return (
    isSelectedMonthTransaction(transaction, month) &&
    transaction.type === 'income' &&
    !transaction.linkedBillId &&
    !hasLinkedNonCashflowMovement(transaction)
  )
}

function isNormalExpenseTransaction(transaction: Transaction, month: string) {
  return (
    isSelectedMonthTransaction(transaction, month) &&
    transaction.type === 'expense' &&
    !hasLinkedNonCashflowMovement(transaction)
  )
}

function accountName(accountsById: Map<string, Account>, accountId?: string) {
  if (!accountId) {
    return 'No account'
  }

  return accountsById.get(accountId)?.name ?? 'Unknown account'
}

function categoryView(categoriesById: Map<string, Category>, categoryId?: string) {
  if (!categoryId) {
    return {
      color: '#64748b',
      icon: 'ellipsis',
      name: 'No category',
    }
  }

  return (
    categoriesById.get(categoryId) ?? {
      color: '#64748b',
      icon: 'ellipsis',
      name: 'Unknown category',
    }
  )
}

function cashflowBars(incomeTotal: number, expenseTotal: number) {
  const maxValue = Math.max(incomeTotal, expenseTotal, 1)

  return [
    {
      label: 'Income',
      value: incomeTotal,
      valueText: formatPkr(incomeTotal),
      progressPercent: Math.round((incomeTotal / maxValue) * 100),
      tone: 'success',
    },
    {
      label: 'Expenses',
      value: expenseTotal,
      valueText: formatPkr(expenseTotal),
      progressPercent: Math.round((expenseTotal / maxValue) * 100),
      tone: 'warning',
    },
  ] satisfies ReportCashflowBar[]
}

function createBudgetRows(
  source: MonthlyReportSourceData,
  month: string,
) {
  const plannerWorkspace = createPlannerWorkspace({
    budgets: source.budgets,
    categories: source.categories,
    month,
    transactions: source.transactions,
  })
  const budgetRows = plannerWorkspace.budgetRows.map((row) => ({
    id: row.id,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    categoryColor: row.categoryColor,
    plannedAmountText: row.plannedAmountText,
    actualAmountText: row.actualAmountText,
    remainingAmountText: row.remainingAmountText,
    usagePercent: row.usagePercent,
    progressPercent: row.progressPercent,
    status: row.status,
    statusLabel: row.statusLabel,
  }))
  const unplannedRows = plannerWorkspace.unplannedSpendingRows.map((row) => ({
    id: `unplanned-${row.categoryId}`,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    categoryColor: row.categoryColor,
    actualAmountText: row.actualAmountText,
  }) satisfies ReportUnplannedBudgetRow)

  return {
    plannedBudgetRows: budgetRows,
    unplannedBudgetRows: unplannedRows,
  }
}

function getCategorySpendingRows(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  totalExpenses: number,
) {
  const categoriesById = createRecordMap(categories)
  const spendingByCategory = new Map<string, number>()

  for (const transaction of transactions) {
    if (!isNormalExpenseTransaction(transaction, month)) {
      continue
    }

    const categoryId = transaction.categoryId ?? 'uncategorized'

    spendingByCategory.set(
      categoryId,
      (spendingByCategory.get(categoryId) ?? 0) + transaction.amount,
    )
  }

  return [...spendingByCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = categoryView(
        categoriesById,
        categoryId === 'uncategorized' ? undefined : categoryId,
      )
      const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0

      return {
        categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        amount,
        amountText: formatPkr(amount),
        percent,
        percentText: `${Math.round(percent)}%`,
        progressPercent: Math.round(percent),
      } satisfies ReportCategorySpendingRow
    })
    .sort((first, second) => second.amount - first.amount)
}

function getCategorySpendingChartRows(
  rows: ReportCategorySpendingRow[],
  maxVisibleCategories = 6,
): ReportCategorySpendingChartRow[] {
  const visibleRows = rows.slice(0, maxVisibleCategories)
  const remainingRows = rows.slice(maxVisibleCategories)
  const chartRows = visibleRows.map((row) => ({
    id: row.categoryId,
    name: row.categoryName,
    amount: row.amount,
    amountText: row.amountText,
    color: row.categoryColor,
    percent: row.percent,
    percentText: row.percentText,
  }))

  if (remainingRows.length === 0) {
    return chartRows
  }

  const otherAmount = remainingRows.reduce(
    (total, row) => total + row.amount,
    0,
  )
  const otherPercent = remainingRows.reduce(
    (total, row) => total + row.percent,
    0,
  )

  return [
    ...chartRows,
    {
      id: 'other',
      name: 'Other',
      amount: otherAmount,
      amountText: formatPkr(otherAmount),
      color: '#64748b',
      percent: otherPercent,
      percentText: `${Math.round(otherPercent)}%`,
    },
  ]
}

function getBillsPaidRows(
  source: MonthlyReportSourceData,
  month: string,
): ReportBillPaidRow[] {
  const accountsById = createRecordMap(source.accounts)
  const billsById = createRecordMap(source.bills)
  const categoriesById = createRecordMap(source.categories)
  const seenBillIds = new Set<string>()

  return source.transactions
    .filter(
      (transaction) =>
        isSelectedMonthTransaction(transaction, month) &&
        transaction.type === 'expense' &&
        Boolean(transaction.linkedBillId),
    )
    .sort(
      (first, second) =>
        getTransactionSortTimestamp(second) - getTransactionSortTimestamp(first),
    )
    .flatMap((transaction) => {
      if (!transaction.linkedBillId || seenBillIds.has(transaction.linkedBillId)) {
        return []
      }

      seenBillIds.add(transaction.linkedBillId)

      const bill = billsById.get(transaction.linkedBillId)
      const category = categoryView(categoriesById, transaction.categoryId)

      return [
        {
          id: transaction.id,
          billName: bill?.name ?? transaction.notes ?? 'Bill payment',
          amountText: formatPkr(transaction.amount),
          paidDateLabel: formatDisplayDate(transaction.date),
          paymentAccountName: accountName(accountsById, transaction.fromAccountId),
          categoryName: category.name,
        },
      ]
    })
}

function getGoalActivity(
  source: MonthlyReportSourceData,
  month: string,
) {
  const accountsById = createRecordMap(source.accounts)
  const goalsById = createRecordMap(source.goals)
  const rows: ReportGoalActivityRow[] = []
  let totalContributions = 0
  let totalWithdrawals = 0

  for (const transaction of source.transactions
    .filter(
      (nextTransaction) =>
        isSelectedMonthTransaction(nextTransaction, month) &&
        nextTransaction.type === 'transfer' &&
        Boolean(nextTransaction.linkedGoalId),
    )
    .sort(
      (first, second) =>
        getTransactionSortTimestamp(second) - getTransactionSortTimestamp(first),
    )) {
    const isContribution = Boolean(transaction.fromAccountId)
    const goal = transaction.linkedGoalId
      ? goalsById.get(transaction.linkedGoalId)
      : undefined

    if (isContribution) {
      totalContributions += transaction.amount
    } else {
      totalWithdrawals += transaction.amount
    }

    rows.push({
      id: transaction.id,
      goalName: goal?.name ?? 'Unknown goal',
      movementLabel: isContribution ? 'Contribution' : 'Withdrawal',
      amountText: formatPkr(transaction.amount),
      dateLabel: formatDisplayDate(transaction.date),
      accountName: accountName(
        accountsById,
        transaction.fromAccountId ?? transaction.toAccountId,
      ),
      notes: transaction.notes,
    })
  }

  return {
    rows,
    summary: {
      totalContributions,
      totalContributionsText: formatPkr(totalContributions),
      totalWithdrawals,
      totalWithdrawalsText: formatPkr(totalWithdrawals),
    },
  }
}

function getLoanMovementLabel(transaction: Transaction, loan?: Loan) {
  if (loan?.type === 'given') {
    return transaction.fromAccountId ? 'Loan Given' : 'Repayment Received'
  }

  if (loan?.type === 'taken') {
    return transaction.toAccountId ? 'Loan Taken' : 'Repayment Made'
  }

  return 'Loan Movement'
}

function getLoanActivity(
  source: MonthlyReportSourceData,
  month: string,
) {
  const accountsById = createRecordMap(source.accounts)
  const loansById = createRecordMap(source.loans)
  const rows: ReportLoanActivityRow[] = []
  let totalRepaymentsReceived = 0
  let totalRepaymentsMade = 0
  let totalLoanGiven = 0
  let totalLoanTaken = 0

  for (const transaction of source.transactions
    .filter(
      (nextTransaction) =>
        isSelectedMonthTransaction(nextTransaction, month) &&
        nextTransaction.type === 'transfer' &&
        Boolean(nextTransaction.linkedLoanId),
    )
    .sort(
      (first, second) =>
        getTransactionSortTimestamp(second) - getTransactionSortTimestamp(first),
    )) {
    const loan = transaction.linkedLoanId
      ? loansById.get(transaction.linkedLoanId)
      : undefined
    const movementLabel = getLoanMovementLabel(transaction, loan)

    if (movementLabel === 'Repayment Received') {
      totalRepaymentsReceived += transaction.amount
    } else if (movementLabel === 'Repayment Made') {
      totalRepaymentsMade += transaction.amount
    } else if (movementLabel === 'Loan Given') {
      totalLoanGiven += transaction.amount
    } else if (movementLabel === 'Loan Taken') {
      totalLoanTaken += transaction.amount
    }

    rows.push({
      id: transaction.id,
      loanName: loan?.name ?? 'Unknown loan',
      loanTypeLabel: loan?.type === 'taken' ? 'Taken' : 'Given',
      movementLabel,
      amountText: formatPkr(transaction.amount),
      dateLabel: formatDisplayDate(transaction.date),
      accountName: accountName(
        accountsById,
        transaction.fromAccountId ?? transaction.toAccountId,
      ),
      counterparty: loan?.counterparty,
    })
  }

  return {
    rows,
    summary: {
      totalRepaymentsReceived,
      totalRepaymentsReceivedText: formatPkr(totalRepaymentsReceived),
      totalRepaymentsMade,
      totalRepaymentsMadeText: formatPkr(totalRepaymentsMade),
      totalLoanGiven,
      totalLoanGivenText: formatPkr(totalLoanGiven),
      totalLoanTaken,
      totalLoanTakenText: formatPkr(totalLoanTaken),
    },
  }
}

export function createMonthlyReport(
  source: MonthlyReportSourceData,
  month: string,
): MonthlyReportData {
  const incomeTotal = source.transactions
    .filter((transaction) => isNormalIncomeTransaction(transaction, month))
    .reduce((total, transaction) => total + transaction.amount, 0)
  const expenseTotal = source.transactions
    .filter((transaction) => isNormalExpenseTransaction(transaction, month))
    .reduce((total, transaction) => total + transaction.amount, 0)
  const netCashflow = incomeTotal - expenseTotal
  const budgetTotals = getPlannerBudgetTotals(
    source.budgets,
    source.transactions,
    month,
  )
  const budgetRemaining = budgetTotals.hasBudgetAllocations
    ? budgetTotals.remainingTotal
    : netCashflow
  const budgetRows = createBudgetRows(source, month)
  const categorySpendingRows = getCategorySpendingRows(
    source.transactions,
    source.categories,
    month,
    expenseTotal,
  )
  const categorySpendingChartRows =
    getCategorySpendingChartRows(categorySpendingRows)
  const billsPaidRows = getBillsPaidRows(source, month)
  const billsPaidTotal = billsPaidRows.reduce((total, row) => {
    const matchingTransaction = source.transactions.find(
      (transaction) => transaction.id === row.id,
    )

    return total + (matchingTransaction?.amount ?? 0)
  }, 0)
  const goalActivity = getGoalActivity(source, month)
  const loanActivity = getLoanActivity(source, month)
  const loanPaymentsTotal =
    loanActivity.summary.totalRepaymentsMade +
    loanActivity.summary.totalRepaymentsReceived
  const selectedMonthTransactions = source.transactions.filter((transaction) =>
    isSelectedMonthTransaction(transaction, month),
  )
  const summaryMetrics: ReportSummaryMetric[] = [
    {
      key: 'income',
      label: 'Total Income',
      value: formatPkr(incomeTotal),
      helper: 'Normal income only',
      tone: 'success',
    },
    {
      key: 'expenses',
      label: 'Total Expenses',
      value: formatPkr(expenseTotal),
      helper: 'Expenses including paid bills',
      tone: 'warning',
    },
    {
      key: 'net-cashflow',
      label: 'Net Cashflow',
      value: formatPkr(netCashflow),
      helper: 'Income minus expenses',
      tone: netCashflow < 0 ? 'warning' : 'info',
    },
    {
      key: 'budget-remaining',
      label: 'Budget Remaining',
      value: formatPkr(budgetRemaining),
      helper: budgetTotals.hasBudgetAllocations
        ? 'Planned budget minus actual'
        : 'Fallback: income minus expenses',
      tone: budgetRemaining < 0 ? 'warning' : 'success',
    },
    {
      key: 'bills-paid',
      label: 'Bills Paid',
      value: formatPkr(billsPaidTotal),
      helper: `${billsPaidRows.length} paid bill${
        billsPaidRows.length === 1 ? '' : 's'
      }`,
      tone: 'default',
    },
    {
      key: 'goal-contributions',
      label: 'Goal Contributions',
      value: goalActivity.summary.totalContributionsText,
      helper: `${goalActivity.summary.totalWithdrawalsText} withdrawn`,
      tone: 'info',
    },
    {
      key: 'loan-payments',
      label: 'Loan Payments',
      value: formatPkr(loanPaymentsTotal),
      helper: `${loanActivity.summary.totalRepaymentsReceivedText} received`,
      tone: 'default',
    },
  ]
  const unplannedBudgetAsLegacyRows = budgetRows.unplannedBudgetRows.map(
    (row) =>
      ({
        ...row,
        plannedAmountText: formatPkr(0),
        remainingAmountText: row.actualAmountText,
        usagePercent: 100,
        progressPercent: 100,
        status: 'unplanned',
        statusLabel: 'Unplanned',
      }) satisfies ReportBudgetRow,
  )

  return {
    month,
    monthLabel: formatBudgetMonth(month),
    summaryMetrics,
    primarySummaryMetrics: summaryMetrics.slice(0, 4),
    secondarySummaryMetrics: summaryMetrics.slice(4),
    cashflowBars: cashflowBars(incomeTotal, expenseTotal),
    budgetRows: [
      ...budgetRows.plannedBudgetRows,
      ...unplannedBudgetAsLegacyRows,
    ],
    plannedBudgetRows: budgetRows.plannedBudgetRows,
    unplannedBudgetRows: budgetRows.unplannedBudgetRows,
    budgetFallback: !budgetTotals.hasBudgetAllocations,
    categorySpendingRows,
    categorySpendingChartRows,
    billsPaidRows,
    goalActivityRows: goalActivity.rows,
    goalActivitySummary: goalActivity.summary,
    loanActivityRows: loanActivity.rows,
    loanActivitySummary: loanActivity.summary,
    hasMonthlyActivity:
      selectedMonthTransactions.length > 0 ||
      budgetRows.plannedBudgetRows.length > 0 ||
      budgetRows.unplannedBudgetRows.length > 0,
  }
}
