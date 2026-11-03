import type { ReactNode } from "react"
import { cx } from "./cx"

export type FieldProps = {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  /** Extra content on the right of the label row (e.g. "Forgot password?"). */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/** `.field`: visible label above, control, then hint or error. */
export function Field({ label, htmlFor, hint, error, aside, className, children }: FieldProps) {
  return (
    <div className={cx("field", className)}>
      {aside ? (
        <span className="flex items-baseline justify-between">
          <label className="field-label" htmlFor={htmlFor}>
            {label}
          </label>
          {aside}
        </span>
      ) : (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span role="alert" className="field-error">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  )
}
