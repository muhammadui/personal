import { cx } from "./cx"

export type CheckboxProps = {
  checked: boolean
  onToggle?: () => void
  label: string
  warn?: boolean
  className?: string
  /** Render a non-interactive box (for previews). */
  static?: boolean
}

/** `.check`: 20×20 box in a 44×44 hit area. Checked: brand-blue pop and drawn tick (motion.md). */
export function Checkbox({ checked, onToggle, label, warn = false, className, static: isStatic = false }: CheckboxProps) {
  const box = (
    <span className="check-box">
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  )
  const cls = cx("check", checked && "is-on", warn && !checked && "check-warn", className)
  if (isStatic) {
    return (
      <span className={cls} style={{ pointerEvents: "none" }} aria-hidden>
        {box}
      </span>
    )
  }
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={cls} onClick={onToggle}>
      {box}
    </button>
  )
}
