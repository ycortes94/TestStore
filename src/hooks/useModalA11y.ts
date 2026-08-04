import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Escape-to-dismiss + initial focus + light focus trap for modal dialogs.
 * Restores focus to the previously focused element on close.
 */
export const useModalA11y = (open: boolean, onDismiss: () => void): void => {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDismiss()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
      if (!dialog) {
        return
      }

      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
      )
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Defer focus so the dialog is in the DOM.
    const focusTimer = window.setTimeout(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
      const preferred =
        dialog?.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog?.querySelector<HTMLElement>(FOCUSABLE)
      preferred?.focus()
    }, 0)

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onDismiss])
}
