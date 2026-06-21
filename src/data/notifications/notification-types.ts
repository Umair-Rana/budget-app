export type AppNotificationType =
  | 'bill-due-today'
  | 'bill-due-tomorrow'
  | 'bill-overdue'
  | 'recurring-due-today'
  | 'recurring-overdue'
  | 'goal-complete'
  | 'goal-exceeded'
  | 'loan-complete'
  | 'budget-warning'
  | 'budget-danger'

export type AppNotificationSeverity = 'info' | 'success' | 'warning' | 'danger'

export type AppNotification = {
  id: string
  type: AppNotificationType
  title: string
  message: string
  severity: AppNotificationSeverity
  createdAt: string
  actionLabel: string
  actionRoute: string
  dismissible: boolean
  priority: number
}
