import type { Bill } from '@/data/models/bill'
import type { BudgetAllocation } from '@/data/models/budget'
import type { Category } from '@/data/models/category'
import type { Goal } from '@/data/models/goal'
import type { Loan } from '@/data/models/loan'
import type { RecurringTransaction } from '@/data/models/recurring-transaction'
import type { Transaction } from '@/data/models/transaction'
import {
  createPlannerWorkspace,
  getCurrentBudgetMonth,
} from '@/data/planner/planner-selectors'
import type { AppNotification } from '@/data/notifications/notification-types'
import { formatPkr } from '@/lib/formatting'

export type NotificationSourceData = {
  bills: Bill[]
  budgets: BudgetAllocation[]
  categories: Category[]
  goals: Goal[]
  loans: Loan[]
  recurringTransactions: RecurringTransaction[]
  transactions: Transaction[]
}

function getDateString(now: Date) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function shiftDateString(date: string, dayDelta: number) {
  const [year, month, day] = date.split('-').map(Number)
  const nextDate = new Date(year, month - 1, day + dayDelta)

  return getDateString(nextDate)
}

function isActiveRecord(record: { archivedAt?: string; deletedAt?: string }) {
  return !record.archivedAt && !record.deletedAt
}

function notificationId(parts: Array<string | number | undefined>) {
  return parts.filter(Boolean).join(':')
}

function createBillNotifications(
  bills: Bill[],
  today: string,
): AppNotification[] {
  const tomorrow = shiftDateString(today, 1)
  const notifications: AppNotification[] = []

  for (const bill of bills) {
    if (!isActiveRecord(bill) || bill.status === 'paid') {
      continue
    }

    if (bill.dueDate < today) {
      notifications.push({
        id: notificationId(['bill', 'overdue', bill.id, bill.dueDate]),
        type: 'bill-overdue',
        title: bill.name,
        message: `Overdue since ${bill.dueDate}.`,
        severity: 'danger',
        createdAt: bill.dueDate,
        actionLabel: 'Open Bills',
        actionRoute: '/bills',
        dismissible: true,
        priority: 10,
      })
      continue
    }

    if (bill.dueDate === today) {
      notifications.push({
        id: notificationId(['bill', 'due-today', bill.id, bill.dueDate]),
        type: 'bill-due-today',
        title: bill.name,
        message: 'Due today.',
        severity: 'warning',
        createdAt: bill.dueDate,
        actionLabel: 'Open Bills',
        actionRoute: '/bills',
        dismissible: true,
        priority: 30,
      })
      continue
    }

    if (bill.dueDate === tomorrow) {
      notifications.push({
        id: notificationId(['bill', 'due-tomorrow', bill.id, bill.dueDate]),
        type: 'bill-due-tomorrow',
        title: bill.name,
        message: 'Due tomorrow.',
        severity: 'info',
        createdAt: bill.dueDate,
        actionLabel: 'Open Bills',
        actionRoute: '/bills',
        dismissible: true,
        priority: 50,
      })
    }
  }

  return notifications
}

function createRecurringNotifications(
  recurringTransactions: RecurringTransaction[],
  today: string,
): AppNotification[] {
  return recurringTransactions.flatMap<AppNotification>((recurringTransaction) => {
    if (
      !isActiveRecord(recurringTransaction) ||
      !recurringTransaction.isActive ||
      recurringTransaction.lastGeneratedForDate ===
        recurringTransaction.nextRunDate ||
      (recurringTransaction.endDate &&
        recurringTransaction.nextRunDate > recurringTransaction.endDate)
    ) {
      return []
    }

    if (recurringTransaction.nextRunDate < today) {
      return [
        {
          id: notificationId([
            'recurring',
            'overdue',
            recurringTransaction.id,
            recurringTransaction.nextRunDate,
          ]),
          type: 'recurring-overdue',
          title: recurringTransaction.name,
          message: `Recurring ${recurringTransaction.type} is overdue.`,
          severity: 'warning',
          createdAt: recurringTransaction.nextRunDate,
          actionLabel: 'Open Recurring',
          actionRoute: '/recurring',
          dismissible: true,
          priority: 35,
        },
      ]
    }

    if (recurringTransaction.nextRunDate === today) {
      return [
        {
          id: notificationId([
            'recurring',
            'due-today',
            recurringTransaction.id,
            recurringTransaction.nextRunDate,
          ]),
          type: 'recurring-due-today',
          title: recurringTransaction.name,
          message: `Recurring ${recurringTransaction.type} is due today.`,
          severity: 'info',
          createdAt: recurringTransaction.nextRunDate,
          actionLabel: 'Open Recurring',
          actionRoute: '/recurring',
          dismissible: true,
          priority: 40,
        },
      ]
    }

    return []
  })
}

function createGoalNotifications(goals: Goal[]): AppNotification[] {
  return goals.flatMap<AppNotification>((goal) => {
    if (!isActiveRecord(goal) || goal.status === 'archived' || goal.targetAmount <= 0) {
      return []
    }

    if (goal.currentAmount > goal.targetAmount) {
      return [
        {
          id: notificationId(['goal', 'exceeded', goal.id, goal.targetAmount]),
          type: 'goal-exceeded',
          title: goal.name,
          message: `Goal exceeded by ${formatPkr(
            goal.currentAmount - goal.targetAmount,
          )}.`,
          severity: 'success',
          createdAt: goal.updatedAt,
          actionLabel: 'Open Goals',
          actionRoute: '/goals',
          dismissible: true,
          priority: 60,
        },
      ]
    }

    if (goal.currentAmount >= goal.targetAmount || goal.status === 'completed') {
      return [
        {
          id: notificationId(['goal', 'complete', goal.id, goal.targetAmount]),
          type: 'goal-complete',
          title: goal.name,
          message: 'Goal reached 100%.',
          severity: 'success',
          createdAt: goal.updatedAt,
          actionLabel: 'Open Goals',
          actionRoute: '/goals',
          dismissible: true,
          priority: 60,
        },
      ]
    }

    return []
  })
}

function createLoanNotifications(loans: Loan[]): AppNotification[] {
  return loans.flatMap<AppNotification>((loan) => {
    if (!isActiveRecord(loan) || loan.status === 'archived') {
      return []
    }

    if (loan.outstandingAmount <= 0 || loan.status === 'completed') {
      return [
        {
          id: notificationId(['loan', 'complete', loan.id, loan.principalAmount]),
          type: 'loan-complete',
          title: loan.name,
          message: 'Loan is fully repaid.',
          severity: 'success',
          createdAt: loan.updatedAt,
          actionLabel: 'Open Loans',
          actionRoute: '/loans',
          dismissible: true,
          priority: 70,
        },
      ]
    }

    return []
  })
}

function createBudgetNotifications(
  source: NotificationSourceData,
  today: string,
): AppNotification[] {
  const month = getCurrentBudgetMonth(new Date(`${today}T00:00:00`))
  const workspace = createPlannerWorkspace({
    budgets: source.budgets,
    categories: source.categories,
    month,
    transactions: source.transactions,
  })

  return workspace.budgetRows.flatMap<AppNotification>((row) => {
    if (row.plannedAmount <= 0 || row.usagePercent < 80) {
      return []
    }

    if (row.usagePercent >= 100) {
      const exceededBy = row.actualAmount - row.plannedAmount
      const exceededText =
        exceededBy > 0
          ? `Exceeded by ${formatPkr(exceededBy)}.`
          : 'Budget is fully used.'

      return [
        {
          id: notificationId(['budget', 'danger', row.id, month]),
          type: 'budget-danger',
          title: row.categoryName,
          message: `${row.usagePercent}% used. ${exceededText}`,
          severity: 'danger',
          createdAt: today,
          actionLabel: 'Open Planner',
          actionRoute: '/planner',
          dismissible: true,
          priority: 20,
        },
      ]
    }

    return [
      {
        id: notificationId(['budget', 'warning', row.id, month]),
        type: 'budget-warning',
        title: row.categoryName,
        message: `${row.usagePercent}% of budget used.`,
        severity: 'warning',
        createdAt: today,
        actionLabel: 'Open Planner',
        actionRoute: '/planner',
        dismissible: true,
        priority: 45,
      },
    ]
  })
}

export function sortNotifications(notifications: AppNotification[]) {
  return [...notifications].sort((first, second) => {
    if (first.priority !== second.priority) {
      return first.priority - second.priority
    }

    if (first.createdAt !== second.createdAt) {
      return second.createdAt.localeCompare(first.createdAt)
    }

    return first.title.localeCompare(second.title)
  })
}

export function createNotifications(
  source: NotificationSourceData,
  now = new Date(),
) {
  const today = getDateString(now)

  return sortNotifications([
    ...createBillNotifications(source.bills, today),
    ...createBudgetNotifications(source, today),
    ...createRecurringNotifications(source.recurringTransactions, today),
    ...createGoalNotifications(source.goals),
    ...createLoanNotifications(source.loans),
  ])
}
