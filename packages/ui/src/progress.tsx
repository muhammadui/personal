import { cx } from "./cx"

/** `.progress`: 6px track; fill animates width. */
export function Progress({ value, inverse = false, label }: { value: number; inverse?: boolean; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className={cx("progress", inverse && "progress-inverse")} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
