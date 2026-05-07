import { useRef } from 'react'
import type { MouseEvent } from 'react'

// Returns mouse handlers for a dialog overlay that close the dialog only when
// the user both presses and releases the mouse on the overlay itself. This
// prevents accidental closes when a drag (e.g. text selection inside an input)
// starts inside the dialog and ends outside, or vice versa.
export function useDialogOverlayDismiss(onDismiss: () => void, enabled: boolean = true) {
  const downOnOverlay = useRef(false)
  return {
    onMouseDown: (e: MouseEvent<HTMLElement>) => {
      downOnOverlay.current = enabled && e.target === e.currentTarget
    },
    onMouseUp: (e: MouseEvent<HTMLElement>) => {
      const wasOnOverlay = downOnOverlay.current
      downOnOverlay.current = false
      if (enabled && wasOnOverlay && e.target === e.currentTarget) onDismiss()
    },
  }
}
