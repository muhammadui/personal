import { Check, Delete } from "lucide-react"
import { useEffect } from "react"
import { cx } from "./cx"

export type PinPadProps = {
  value: string
  onChange: (value: string) => void
  /** Number of digits shown as squares. */
  length: number
  disabled?: boolean
  /** Also accept digits, Backspace and Enter from a hardware keyboard. */
  keyboard?: boolean
  onEnter?: (() => void) | undefined
  /** Shows an OK key in the empty corner; used when the PIN length isn't known in advance. */
  submitLabel?: string | undefined
  className?: string
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

/** Entered digits as 12px squares (`.pin-dots`). */
export function PinDots({ count, length, className }: { count: number; length: number; className?: string }) {
  return (
    <div className={cx("pin-dots", className)} role="status" aria-live="polite" aria-label={`${count} of ${length} digits entered`}>
      {Array.from({ length }, (_, i) => (
        <span key={i} className={cx("pin-dot", i < count && "is-on")} />
      ))}
    </div>
  )
}

/** `.pin-key` grid: 1–9, 0 and Delete (components.md "PIN pad"). */
export function PinPad({ value, onChange, length, disabled = false, keyboard = true, onEnter, submitLabel, className }: PinPadProps) {
  const add = (d: string) => {
    if (!disabled && value.length < length) onChange(value + d)
  }
  const back = () => {
    if (!disabled) onChange(value.slice(0, -1))
  }

  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if (disabled || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (value.length < length) onChange(value + e.key)
      } else if (e.key === "Backspace") {
        e.preventDefault()
        onChange(value.slice(0, -1))
      } else if (e.key === "Enter" && onEnter) {
        e.preventDefault()
        onEnter()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [keyboard, disabled, value, length, onChange, onEnter])

  return (
    <div className={cx("pin-grid", className)}>
      {KEYS.map((d) => (
        <button key={d} type="button" className="pin-key" disabled={disabled} onClick={() => add(d)}>
          {d}
        </button>
      ))}
      {submitLabel ? (
        <button type="button" className="pin-key flex items-center justify-center" style={{ background: "transparent" }} aria-label={submitLabel} disabled={disabled || !onEnter} onClick={() => onEnter?.()}>
          <Check size={24} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="pin-key" disabled={disabled} onClick={() => add("0")}>
        0
      </button>
      <button type="button" className="pin-key flex items-center justify-center" style={{ background: "transparent" }} aria-label="Delete" disabled={disabled} onClick={back}>
        <Delete size={24} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
