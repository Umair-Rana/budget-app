import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export const inputControlClassName =
  'h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60'

export const textareaControlClassName =
  'min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60'

export function FormField({
  children,
  className,
  description,
  error,
  label,
  required,
}: {
  children: ReactNode
  className?: string
  description?: ReactNode
  error?: string
  label: string
  required?: boolean
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <>
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </>
        ) : null}
      </span>
      {children}
      {description ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

export function ReadOnlyField({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}
