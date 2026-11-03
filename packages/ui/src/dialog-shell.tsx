import type { ReactNode } from "react"
import { cx } from "./cx"
import { useOverlay } from "./use-overlay"

export type DialogShellProps = {
  open: boolean
  onClose: () => void
  /** Accessible name. */
  label: string
  className?: string
  children: ReactNode
}

/** A bare `.dialog` over the scrim, for custom layouts (command palette, keyboard shortcuts). */
export function DialogShell({ open, onClose, label, className, children }: DialogShellProps) {
  const { ref, visible, closing } = useOverlay(open)
  if (!visible) return null
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cx("overlay", closing && "is-closing")}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="scrim" onClick={onClose} aria-hidden />
      <section className={cx("dialog", className)}>{children}</section>
    </dialog>
  )
}
