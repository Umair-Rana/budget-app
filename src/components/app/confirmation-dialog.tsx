import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useDialogFocus } from '@/hooks/use-dialog-focus'
import { registerDialogClose } from '@/lib/dialog-stack'

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useDialogFocus({
    closeDisabled: isSubmitting,
    dialogRef,
    enabled: open,
    onClose: onCancel,
  })

  useEffect(() => {
    if (!open || isSubmitting) {
      return undefined
    }

    return registerDialogClose({
      id: `confirmation:${title}`,
      onClose: onCancel,
    })
  }, [isSubmitting, onCancel, open, title])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirmation-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p
              id="confirmation-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-autofocus
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
