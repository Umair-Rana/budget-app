import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

export type ToastMessage = ToastInput & {
  id: string
  variant: ToastVariant
}

export type ToastContextValue = {
  showToast: (toast: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
