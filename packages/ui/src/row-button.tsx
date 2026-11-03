import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "./cx"

export type RowButtonProps = {
  icon?: ReactNode
  label: ReactNode
  value?: ReactNode
  onClick?: () => void
  chevron?: boolean
  accent?: boolean
  className?: string
}

/** A list row used as a button: icon, label, value on the right, chevron (task detail, settings). */
export function RowButton({ icon, label, value, onClick, chevron = true, accent = false, className }: RowButtonProps) {
  return (
    <button type="button" className={cx("task row-btn", className)} style={{ minHeight: 52, color: accent ? "var(--text-accent)" : undefined }} onClick={onClick}>
      {icon ? <span className="flex" style={{ color: "var(--ink-muted)" }}>{icon}</span> : null}
      <span className="task-body">
        <span className="t-body-strong" style={{ fontWeight: accent ? 700 : 600 }}>
          {label}
        </span>
      </span>
      {value !== undefined ? (
        <span className="t-meta" style={{ color: "var(--ink-secondary)" }}>
          {value}
        </span>
      ) : null}
      {chevron ? (
        <span className="flex" style={{ color: "var(--ink-faint)" }}>
          <ChevronRight size={18} strokeWidth={2} aria-hidden />
        </span>
      ) : null}
    </button>
  )
}
