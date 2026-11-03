import { cx } from "./cx"

/** `.switch`: 40×24, knob slides with spring. */
export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx("switch", checked && "is-on", disabled && "opacity-40")}
      onClick={() => onChange(!checked)}
    />
  )
}
