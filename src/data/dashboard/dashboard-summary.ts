import type { Account } from '@/data/models/account'
import type { Bill } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { Transaction } from '@/data/models/transaction'
import {
  getActiveAccounts,
  getActiveCategories,
  getActiveExpenseCategories,
  getAvailableBalance,
  getBudgetRemaining,
  getCurrentMonthPrefix,
  getDashboardLoanSummary,
  getGoalsSnapshot,
  getMonthlyExpenses,
  getMonthlyIncome,
  getRecentTransactions,
  getUpcomingBills,
  type DashboardGoalSnapshot,
  type DashboardLoanSummary,
  type DashboardRecentTransaction,
  type DashboardUpcomingBill,
} from '@/data/dashboard/dashboard-selectors'
import { getPlannerBudgetTotals } from '@/data/planner/planner-selectors'
import { formatPkr } from '@/lib/formatting'

export type OverviewDashboardSourceData = {
  accounts: Account[]
  bills: Bill[]
  budgets: BudgetAllocation[]
  categories: Category[]
  goals: Goal[]
  loans: Loan[]
  transactions: Transaction[]
}

export type OverviewDashboardMetric = {
  label: string
  value: string
  helper: string
  tone: 'balance' | 'income' | 'expense' | 'remaining'
}

export type OverviewDashboardData = {
  activeAccounts: Account[]
  activeCategories: Category[]
  expenseCategories: Category[]
  hasAnyData: boolean
  metrics: OverviewDashboardMetric[]
  recentTransactions: DashboardRecentTransaction[]
  upcomingBills: DashboardUpcomingBill[]
  goalsSnapshot: DashboardGoalSnapshot[]
  loanSummary: DashboardLoanSummary
}

function hasAnyFinanceData(source: OverviewDashboardSourceData) {
  return (
    source.accounts.length > 0 ||
    source.transactions.length > 0 ||
    source.bills.length > 0 ||
    source.budgets.length > 0 ||
    source.goals.length > 0 ||
    source.loans.length > 0
  )
}

export function createOverviewDashboard(
  source: OverviewDashboardSourceData,
  now = new Date(),
): OverviewDashboardData {
  const availableBalance = getAvailableBalance(source.accounts)
  const monthlyIncome = getMonthlyIncome(source.transactions, now)
  const monthlyExpenses = getMonthlyExpenses(source.transactions, now)
  const budgetMonth = getCurrentMonthPrefix(now)
  const budgetTotals = getPlannerBudgetTotals(
    source.budgets,
    source.transactions,
    budgetMonth,
  )
  const budgetRemaining = budgetTotals.hasBudgetAllocations
    ? budgetTotals.remainingTotal
    : getBudgetRemaining(monthlyIncome, monthlyExpenses)

  return {
    activeAccounts: getActiveAccounts(source.accounts),
    activeCategories: getActiveCategories(source.categories),
    expenseCategories: getActiveExpenseCategories(source.categories),
    hasAnyData: hasAnyFinanceData(source),
    metrics: [
      {
        label: 'Available Balance',
        value: formatPkr(availableBalance),
        helper: 'Across active accounts',
        tone: 'balance',
      },
      {
        label: 'Monthly Income',
        value: formatPkr(monthlyIncome),
        helper: 'Current month income transactions',
        tone: 'income',
      },
      {
        label: 'Monthly Expenses',
        value: formatPkr(monthlyExpenses),
        helper: 'Current month expense transactions',
        tone: 'expense',
      },
      {
        label: 'Budget Remaining',
        value: formatPkr(budgetRemaining),
        helper: budgetTotals.hasBudgetAllocations
          ? 'Planned budget minus actual spending'
          : 'Income minus expenses until budgets exist',
        tone: 'remaining',
      },
    ],
    recentTransactions: getRecentTransactions(
      source.transactions,
      source.accounts,
      source.categories,
      source.loans,
      8,
    ),
    upcomingBills: getUpcomingBills(source.bills, 5),
    goalsSnapshot: getGoalsSnapshot(source.goals, 5),
    loanSummary: getDashboardLoanSummary(source.loans),
  }
}
