import type { ReactNode } from "react"
import { Checkbox } from "./checkbox"
import { cx } from "./cx"

export type TaskRowProps = {
  title: ReactNode
  done: boolean
  onToggle: () => void
  onOpen?: () => void
  meta?: ReactNode
  /** Right-side content: a badge or a button. */
  trailing?: ReactNode
  warn?: boolean
  leaving?: boolean
  selected?: boolean
  checkLabel?: string
  className?: string
}

/** `.task`: 56px row with checkbox, title (animated strike when done), meta line, optional trailing badge. */
export function TaskRow({ title, done, onToggle, onOpen, meta, trailing, warn = false, leaving = false, selected = false, checkLabel, className }: TaskRowProps) {
  return (
    <div className={cx("task", done && "is-done", leaving && "is-leaving", className)} style={selected ? { background: "var(--tint-blue)" } : undefined}>
      <Checkbox checked={done} onToggle={onToggle} warn={warn} label={checkLabel ?? (done ? "Mark not done" : "Mark done")} />
      {onOpen ? (
        <button type="button" className="task-open" onClick={onOpen}>
          <span className="task-title">{title}</span>
          {meta ? <span className="task-meta">{meta}</span> : null}
        </button>
      ) : (
        <div className="task-body">
          <span className="task-title">{title}</span>
          {meta ? <span className="task-meta">{meta}</span> : null}
        </div>
      )}
      {trailing}
    </div>
  )
}
