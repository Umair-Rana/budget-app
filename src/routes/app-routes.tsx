import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { LoadingState } from '@/components/app/loading-state'
import { AppLayout } from '@/layouts/app-layout'

const AccountsPage = lazy(() =>
  import('@/pages/accounts-page').then((module) => ({
    default: module.AccountsPage,
  })),
)
const AuditHistoryPage = lazy(() =>
  import('@/pages/audit-history-page').then((module) => ({
    default: module.AuditHistoryPage,
  })),
)
const BillsPage = lazy(() =>
  import('@/pages/bills-page').then((module) => ({
    default: module.BillsPage,
  })),
)
const GoalsPage = lazy(() =>
  import('@/pages/goals-page').then((module) => ({
    default: module.GoalsPage,
  })),
)
const LoansPage = lazy(() =>
  import('@/pages/loans-page').then((module) => ({
    default: module.LoansPage,
  })),
)
const MorePage = lazy(() =>
  import('@/pages/more-page').then((module) => ({
    default: module.MorePage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((module) => ({
    default: module.NotFoundPage,
  })),
)
const OverviewPage = lazy(() =>
  import('@/pages/overview-page').then((module) => ({
    default: module.OverviewPage,
  })),
)
const PlannerPage = lazy(() =>
  import('@/pages/planner-page').then((module) => ({
    default: module.PlannerPage,
  })),
)
const ReportsPage = lazy(() =>
  import('@/pages/reports-page').then((module) => ({
    default: module.ReportsPage,
  })),
)
const RecurringTransactionsPage = lazy(() =>
  import('@/pages/recurring-transactions-page').then((module) => ({
    default: module.RecurringTransactionsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then((module) => ({
    default: module.SettingsPage,
  })),
)
const TransactionsPage = lazy(() =>
  import('@/pages/transactions-page').then((module) => ({
    default: module.TransactionsPage,
  })),
)

function withPageSuspense(page: ReactNode) {
  return (
    <Suspense fallback={<LoadingState message="Loading page..." />}>
      {page}
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={withPageSuspense(<OverviewPage />)} />
        <Route
          path="transactions"
          element={withPageSuspense(<TransactionsPage />)}
        />
        <Route
          path="recurring"
          element={withPageSuspense(<RecurringTransactionsPage />)}
        />
        <Route path="planner" element={withPageSuspense(<PlannerPage />)} />
        <Route path="more" element={withPageSuspense(<MorePage />)} />
        <Route path="bills" element={withPageSuspense(<BillsPage />)} />
        <Route path="goals" element={withPageSuspense(<GoalsPage />)} />
        <Route path="loans" element={withPageSuspense(<LoansPage />)} />
        <Route path="accounts" element={withPageSuspense(<AccountsPage />)} />
        <Route path="reports" element={withPageSuspense(<ReportsPage />)} />
        <Route
          path="audit-history"
          element={withPageSuspense(<AuditHistoryPage />)}
        />
        <Route path="settings" element={withPageSuspense(<SettingsPage />)} />
        <Route path="404" element={withPageSuspense(<NotFoundPage />)} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}
