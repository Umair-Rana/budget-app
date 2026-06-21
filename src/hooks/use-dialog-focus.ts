import {
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const defaultInitialFocusSelector = [
  '[data-autofocus]',
  'form input:not([type="hidden"]):not([disabled])',
  'form select:not([disabled])',
  'form textarea:not([disabled])',
  'form button:not([disabled])',
].join(',')

export function useDialogFocus<TElement extends HTMLElement>({
  closeDisabled,
  dialogRef,
  enabled = true,
  initialFocusSelector = defaultInitialFocusSelector,
  onClose,
}: {
  closeDisabled?: boolean
  dialogRef: RefObject<TElement | null>
  enabled?: boolean
  initialFocusSelector?: string
  onClose?: () => void
}) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current

      if (!dialog) {
        return
      }

      previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : previouslyFocusedElement

      const initialFocusTarget =
        dialog.querySelector<HTMLElement>(initialFocusSelector) ??
        dialog.querySelector<HTMLElement>(focusableSelector) ??
        dialog

      initialFocusTarget.focus({ preventScroll: true })
    }, 50)

    return () => {
      window.clearTimeout(focusTimer)

      if (previouslyFocusedElement && document.contains(previouslyFocusedElement)) {
        previouslyFocusedElement.focus({ preventScroll: true })
      }
    }
  }, [dialogRef, enabled, initialFocusSelector])

  useEffect(() => {
    if (!enabled || !onClose) {
      return
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || closeDisabled) {
        return
      }

      event.stopPropagation()
      onClose?.()
    }

    document.addEventListener('keydown', handleDocumentKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true)
    }
  }, [closeDisabled, enabled, onClose])

  return function handleDialogKeyDown(event: ReactKeyboardEvent<TElement>) {
    if (event.key === 'Tab') {
      const dialog = dialogRef.current

      if (!dialog) {
        return
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

      if (!focusableElements.length) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus({ preventScroll: true })
        return
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus({ preventScroll: true })
      }

      return
    }

    if (event.key !== 'Escape' || closeDisabled || !onClose) {
      return
    }

    event.stopPropagation()
    onClose()
  }
}
