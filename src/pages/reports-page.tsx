import { useQuery } from '@tanstack/react-query'
import { ChartColumn, ClipboardList, Plus, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/app/empty-state'
import { ErrorState } from '@/components/app/error-state'
import { LoadingState } from '@/components/app/loading-state'
import { MonthSelector } from '@/components/app/month-selector'
import { PageShell } from '@/components/app/page-shell'
import { ReportsBillsPaidSection } from '@/components/reports/reports-bills-paid-section'
import { ReportsBudgetSection } from '@/components/reports/reports-budget-section'
import { ReportsCashflowChart } from '@/components/reports/reports-cashflow-chart'
import { ReportsCategorySpending } from '@/components/reports/reports-category-spending'
import { ReportsGoalActivitySection } from '@/components/reports/reports-goal-activity-section'
import { ReportsLoanActivitySection } from '@/components/reports/reports-loan-activity-section'
import { ReportsSummaryCards } from '@/components/reports/reports-summary-cards'
import { Button } from '@/components/ui/button'
import {
  formatBudgetMonth,
  getCurrentBudgetMonth,
  shiftBudgetMonth,
} from '@/data/planner/planner-selectors'
import {
  getMonthlyReport,
  monthlyReportQueryKey,
} from '@/data/reports/reports-queries'
import { useFinanceDataSource } from '@/hooks/use-finance-data-source'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentBudgetMonth)
  const { dataSource, dataSourceKey } = useFinanceDataSource()
  const reportQuery = useQuery({
    queryKey: [...monthlyReportQueryKey(selectedMonth), dataSourceKey],
    queryFn: () => getMonthlyReport(selectedMonth, dataSource),
  })
  const report = reportQuery.data
  const loading = reportQuery.isLoading
  const loadError = reportQuery.error

  return (
    <PageShell
      eyebrow="Reports"
      title="Reports"
      description="Review monthly financial activity from your Supabase household records."
      breadcrumb={[{ label: 'More', href: '/more' }]}
    >
      <div className="flex flex-col gap-4">
        <MonthSelector
          month={selectedMonth}
          monthLabel={report?.monthLabel ?? formatBudgetMonth(selectedMonth)}
          description="Review historical income, spending, budgets, bills, goals, and loans."
          onMonthChange={setSelectedMonth}
          onPreviousMonth={() =>
            setSelectedMonth(shiftBudgetMonth(selectedMonth, -1))
          }
          onNextMonth={() =>
            setSelectedMonth(shiftBudgetMonth(selectedMonth, 1))
          }
          onCurrentMonth={() => setSelectedMonth(getCurrentBudgetMonth())}
        />

        {loading ? (
          <LoadingState message="Loading reports..." />
        ) : null}

        {loadError ? (
          <ErrorState message={getErrorMessage(loadError)} />
        ) : null}

        {!loading && !loadError && report && !report.hasMonthlyActivity ? (
          <EmptyState
            icon={ChartColumn}
            title="No financial activity found for this month."
            message="Reports will appear after you add transactions, budgets, or paid bills for the selected month."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link to="/transactions">
                    <Plus className="size-4" aria-hidden="true" />
                    Add Transaction
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/planner">
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Add Budget
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/bills">
                    <ReceiptText className="size-4" aria-hidden="true" />
                    Add Bill
                  </Link>
                </Button>
              </div>
            }
          />
        ) : null}

        {!loading && !loadError && report && report.hasMonthlyActivity ? (
          <>
            <ReportsSummaryCards
              primaryMetrics={report.primarySummaryMetrics}
              secondaryMetrics={report.secondarySummaryMetrics}
            />

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <ReportsCashflowChart bars={report.cashflowBars} />
              <ReportsCategorySpending
                rows={report.categorySpendingRows}
                chartRows={report.categorySpendingChartRows}
              />
            </div>

            <ReportsBudgetSection
              plannedRows={report.plannedBudgetRows}
              unplannedRows={report.unplannedBudgetRows}
              budgetFallback={report.budgetFallback}
            />

            <ReportsBillsPaidSection rows={report.billsPaidRows} />

            <div className="grid gap-4 xl:grid-cols-2">
              <ReportsGoalActivitySection
                rows={report.goalActivityRows}
                summary={report.goalActivitySummary}
              />
              <ReportsLoanActivitySection
                rows={report.loanActivityRows}
                summary={report.loanActivitySummary}
              />
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  )
}
