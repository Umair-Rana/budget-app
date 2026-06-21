import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  ToastContext,
  type ToastInput,
  type ToastMessage,
} from '@/providers/toast-context'
import { cn } from '@/lib/utils'

const toastDurationMs = 4200

function createToast(input: ToastInput): ToastMessage {
  return {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    variant: input.variant ?? 'info',
  }
}

function ToastIcon({ variant }: { variant: ToastMessage['variant'] }) {
  if (variant === 'success') {
    return <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
  }

  if (variant === 'error') {
    return <XCircle className="size-4 text-destructive" aria-hidden="true" />
  }

  return <Info className="size-4 text-info" aria-hidden="true" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (input: ToastInput) => {
      const toast = createToast(input)

      setToasts((current) => [...current, toast])
      window.setTimeout(() => dismissToast(toast.id), toastDurationMs)
    },
    [dismissToast],
  )

  const contextValue = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed inset-x-3 bottom-24 z-[60] mx-auto flex max-w-md flex-col gap-2 lg:bottom-4 lg:right-4 lg:left-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-lg',
              toast.variant === 'error' && 'border-destructive/35',
              toast.variant === 'success' && 'border-success/35',
              toast.variant === 'info' && 'border-info/35',
            )}
          >
            <ToastIcon variant={toast.variant} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
