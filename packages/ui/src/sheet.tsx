import type { ReactNode } from "react"
import { cx } from "./cx"
import { useOverlay } from "./use-overlay"

export type SheetProps = {
  open: boolean
  onClose: () => void
  /** Accessible name. */
  label: string
  /** "sheet": bottom sheet (centred dialog from 768px). "panel": full screen on phones, right side panel from 768px. */
  variant?: "sheet" | "panel"
  className?: string
  children: ReactNode
}

/** `.sheet` + `.scrim` in a native modal dialog: slides up, scrim fades; tap scrim or Esc to close. */
export function Sheet({ open, onClose, label, variant = "sheet", className, children }: SheetProps) {
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
      <section className={cx("sheet", variant === "panel" && "sheet-full sheet-panel", className ?? (variant === "sheet" ? "flex flex-col gap-4 px-5" : "flex flex-col"))}>
        {variant === "sheet" ? <span className="sheet-handle" aria-hidden /> : null}
        {children}
      </section>
    </dialog>
  )
}
