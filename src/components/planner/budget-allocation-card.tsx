import {
  Archive,
  Pencil,
  Trash2,
} from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { DetailLine } from '@/components/app/detail-line'
import { ProgressRow, type ProgressRowTone } from '@/components/app/progress-row'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  BudgetUsageStatus,
  PlannerBudgetRow,
} from '@/data/planner/planner-selectors'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type BudgetAllocationCardProps = {
  row: PlannerBudgetRow
  onArchive: (row: PlannerBudgetRow) => void
  onDelete: (row: PlannerBudgetRow) => void
  onEdit: (row: PlannerBudgetRow) => void
}

function statusTone(status: BudgetUsageStatus): StatusBadgeTone {
  if (status === 'safe') {
    return 'success'
  }

  if (status === 'near-limit') {
    return 'warning'
  }

  if (status === 'over-budget') {
    return 'danger'
  }

  return 'info'
}

function progressTone(status: BudgetUsageStatus): ProgressRowTone {
  if (status === 'over-budget') {
    return 'danger'
  }

  if (status === 'near-limit') {
    return 'warning'
  }

  return 'success'
}

function cardClassName(status: BudgetUsageStatus) {
  if (status === 'over-budget') {
    return 'border-destructive/35'
  }

  if (status === 'near-limit') {
    return 'border-warning/35'
  }

  return undefined
}

export function BudgetAllocationCard({
  onArchive,
  onDelete,
  onEdit,
  row,
}: BudgetAllocationCardProps) {
  return (
    <Card className={cn('overflow-hidden', cardClassName(row.status))}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: row.categoryColor }}
          >
            {renderIconByName(row.categoryIcon, 'size-5')}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              {row.categoryName}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(row.status)}>{row.statusLabel}</StatusBadge>
              {row.groupLabel ? (
                <StatusBadge>{row.groupLabel}</StatusBadge>
              ) : null}
            </div>
          </div>
        </div>

        <ActionMenu
          label={`Open actions for ${row.categoryName}`}
          items={[
            {
              icon: Pencil,
              label: 'Edit',
              onSelect: () => onEdit(row),
            },
            {
              icon: Archive,
              label: 'Archive',
              onSelect: () => onArchive(row),
            },
            {
              icon: Trash2,
              label: 'Delete',
              onSelect: () => onDelete(row),
              separatorBefore: true,
              variant: 'destructive',
            },
          ]}
        />
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <DetailLine label="Planned" amount={row.plannedAmount} valueSize="large" />
          <DetailLine label="Actual" amount={row.actualAmount} valueSize="large" />
          <DetailLine
            label="Remaining"
            amount={row.remainingAmount}
            valueSize="large"
            valueTone={row.remainingAmount < 0 ? 'danger' : 'default'}
          />
        </div>

        <ProgressRow
          className="mt-5"
          label="Usage"
          percent={row.progressPercent}
          percentLabel={`${row.usagePercent}%`}
          tone={progressTone(row.status)}
        />

        {row.notes ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {row.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
