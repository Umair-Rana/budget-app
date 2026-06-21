import { X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useDialogFocus } from '@/hooks/use-dialog-focus'
import { cn } from '@/lib/utils'

export function ModalDialogShell({
  children,
  description,
  id,
  maxWidthClassName = 'sm:max-w-lg',
  onClose,
  title,
  closeDisabled,
}: {
  children: ReactNode
  description?: string
  id: string
  maxWidthClassName?: string
  onClose: () => void
  title: string
  closeDisabled?: boolean
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const descriptionId = description ? `${id}-description` : undefined
  const handleKeyDown = useDialogFocus({
    closeDisabled,
    dialogRef,
    onClose,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'max-h-[92svh] w-full overflow-y-auto rounded-t-lg border bg-card text-card-foreground shadow-xl sm:rounded-lg',
          maxWidthClassName,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-card px-5 py-4">
          <div>
            <h2 id={id} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Close ${title}`}
            onClick={onClose}
            disabled={closeDisabled}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {children}
      </div>
    </div>
  )
}

export function ModalDialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
      {children}
    </div>
  )
}
