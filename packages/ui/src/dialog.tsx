import type { ReactNode } from "react"
import { cx } from "./cx"
import { useOverlay } from "./use-overlay"

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
}

/** `.dialog`: surface, radius-xl, shadow-lg, centred over the scrim. */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const { ref, visible, closing } = useOverlay(open)
  if (!visible) return null
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={cx("overlay", closing && "is-closing")}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="scrim" onClick={onClose} aria-hidden />
      <div className="dialog flex flex-col gap-4 p-6">
        <h2 className="t-title3">{title}</h2>
        <div className="t-body" style={{ color: "var(--ink-secondary)" }}>
          {children}
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </dialog>
  )
}
