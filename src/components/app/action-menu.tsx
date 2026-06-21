import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Fragment } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ActionMenuItem = {
  disabled?: boolean
  icon: LucideIcon
  label: string
  onSelect: () => void
  separatorBefore?: boolean
  variant?: 'default' | 'destructive'
}

export function ActionMenu({
  items,
  label,
}: {
  items: ActionMenuItem[]
  label: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-haspopup="menu"
          title={label}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        {items.map((item, index) => {
          const Icon = item.icon
          const actionLabel =
            item.variant === 'destructive'
              ? `${item.label} (destructive action)`
              : item.label

          return (
            <Fragment key={`${item.label}-${index}`}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={item.disabled}
                variant={item.variant}
                aria-label={actionLabel}
                onSelect={(event) => {
                  if (item.disabled) {
                    event.preventDefault()
                    return
                  }

                  item.onSelect()
                }}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </DropdownMenuItem>
            </Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
