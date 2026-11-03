import { useState } from "react"
import { cx } from "./cx"

export type CodeInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  length?: number
  label?: string
  autoFocus?: boolean
}

/** `.code-input`: six 48×56 cells over one real input, so paste and iPhone autofill work. */
export function CodeInput({ value, onChange, id, length = 6, label = "6-digit code", autoFocus = false }: CodeInputProps) {
  const [focused, setFocused] = useState(autoFocus)
  const cells = Array.from({ length }, (_, i) => value[i] ?? "")
  const active = Math.min(value.length, length - 1)
  return (
    <div className="code-input" role="group" aria-label={label}>
      {cells.map((c, i) => (
        <span key={i} className={cx("code-cell", c && "is-filled", focused && i === active && value.length < length && "is-active")} aria-hidden>
          {c}
        </span>
      ))}
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        autoFocus={autoFocus}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
      />
    </div>
  )
}
