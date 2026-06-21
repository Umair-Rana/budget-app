import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  PiggyBank,
  Trash2,
} from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { DetailLine } from '@/components/app/detail-line'
import { ProgressRow } from '@/components/app/progress-row'
import { StatusBadge, type StatusBadgeTone } from '@/components/app/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getGoalPriorityLabel,
  getGoalStatusLabel,
} from '@/data/display/goal-options'
import type { Goal } from '@/data/models/goal'
import { formatDisplayDate } from '@/lib/formatting'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type GoalCardProps = {
  goal: Goal
  onArchive: (goal: Goal) => void
  onContribute: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onEdit: (goal: Goal) => void
  onWithdraw: (goal: Goal) => void
}

function progressPercent(goal: Goal) {
  if (goal.targetAmount <= 0) {
    return 0
  }

  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
}

function priorityVariant(goal: Goal): StatusBadgeTone {
  if (goal.priority === 'high') {
    return 'warning'
  }

  if (goal.priority === 'medium') {
    return 'info'
  }

  return 'neutral'
}

function statusVariant(goal: Goal): StatusBadgeTone {
  if (goal.status === 'completed') {
    return 'success'
  }

  if (goal.status === 'archived') {
    return 'neutral'
  }

  return 'neutral'
}

function cardClassName(goal: Goal) {
  if (goal.status === 'completed') {
    return 'border-success/30'
  }

  if (goal.priority === 'high') {
    return 'border-warning/35'
  }

  return undefined
}

export function GoalCard({
  goal,
  onArchive,
  onContribute,
  onDelete,
  onEdit,
  onWithdraw,
}: GoalCardProps) {
  const percent = progressPercent(goal)
  const remainingAmount = Math.max(goal.targetAmount - goal.currentAmount, 0)
  const hasIcon = Boolean(goal.icon)
  const canContribute = goal.status !== 'completed'
  const canWithdraw = goal.currentAmount > 0

  return (
    <Card className={cn('overflow-hidden', cardClassName(goal))}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
              !hasIcon && 'bg-muted text-muted-foreground',
            )}
            style={hasIcon ? { backgroundColor: goal.color } : undefined}
          >
            {hasIcon ? (
              renderIconByName(goal.icon ?? '', 'size-5')
            ) : (
              <PiggyBank className="size-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{goal.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {goal.targetDate
                ? `Target ${formatDisplayDate(goal.targetDate)}`
                : 'No target date'}
            </p>
          </div>
        </div>

        <ActionMenu
          label={`Open actions for ${goal.name}`}
          items={[
            {
              disabled: !canContribute,
              icon: ArrowDownToLine,
              label: 'Add Contribution',
              onSelect: () => onContribute(goal),
            },
            {
              disabled: !canWithdraw,
              icon: ArrowUpFromLine,
              label: 'Withdraw',
              onSelect: () => onWithdraw(goal),
            },
            {
              icon: Pencil,
              label: 'Edit',
              onSelect: () => onEdit(goal),
            },
            {
              icon: Archive,
              label: 'Archive',
              onSelect: () => onArchive(goal),
            },
            {
              icon: Trash2,
              label: 'Delete',
              onSelect: () => onDelete(goal),
              separatorBefore: true,
              variant: 'destructive',
            },
          ]}
        />
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={priorityVariant(goal)}>
            {getGoalPriorityLabel(goal.priority)} priority
          </StatusBadge>
          <StatusBadge tone={statusVariant(goal)}>
            {getGoalStatusLabel(goal.status)}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DetailLine label="Saved" amount={goal.currentAmount} valueSize="xl" />
          <DetailLine label="Target" amount={goal.targetAmount} valueSize="xl" />
          <DetailLine label="Remaining" amount={remainingAmount} valueSize="xl" />
        </div>

        <ProgressRow className="mt-5" label="Progress" percent={percent} />

        {goal.notes ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {goal.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
