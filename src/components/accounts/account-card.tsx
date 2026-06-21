import { Archive, Pencil, Trash2 } from 'lucide-react'

import { ActionMenu } from '@/components/app/action-menu'
import { DetailLine } from '@/components/app/detail-line'
import { StatusBadge } from '@/components/app/status-badge'
import { getAccountTypeLabel } from '@/data/display/account-options'
import type { Account } from '@/data/models/account'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { renderIconByName } from '@/lib/icon-map'
import { cn } from '@/lib/utils'

type AccountCardProps = {
  account: Account
  onEdit: (account: Account) => void
  onArchive: (account: Account) => void
  onDelete: (account: Account) => void
}

export function AccountCard({
  account,
  onArchive,
  onDelete,
  onEdit,
}: AccountCardProps) {
  const isArchived = Boolean(account.archivedAt)
  const isNegative = account.currentBalance < 0

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isArchived && 'bg-muted/30',
        isNegative && 'border-warning/45',
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: account.color }}
          >
            {renderIconByName(account.icon, 'size-5')}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{account.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {getAccountTypeLabel(account.type)}
            </p>
          </div>
        </div>

        <ActionMenu
          label={`Open actions for ${account.name}`}
          items={[
            {
              icon: Pencil,
              label: 'Edit',
              onSelect: () => onEdit(account),
            },
            {
              disabled: isArchived,
              icon: Archive,
              label: 'Archive',
              onSelect: () => onArchive(account),
            },
            {
              icon: Trash2,
              label: 'Delete',
              onSelect: () => onDelete(account),
              separatorBefore: true,
              variant: 'destructive',
            },
          ]}
        />
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
          {isArchived ? <StatusBadge>Archived</StatusBadge> : null}
          {isNegative ? (
            <StatusBadge tone="warning">Negative balance</StatusBadge>
          ) : null}
          <StatusBadge tone="outline">{account.currency}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailLine
            label="Current Balance"
            amount={account.currentBalance}
            valueSize="xl"
            valueTone={isNegative ? 'warning' : 'default'}
          />
          <DetailLine
            label="Opening Balance"
            amount={account.openingBalance}
            valueSize="large"
          />
        </div>

        {account.notes ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {account.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
