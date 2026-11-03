import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { cx } from "./cx"
import type { TextInputProps } from "./text-input"

/** Password field with a show/hide button inside it (`.input-wrap`). */
export function PasswordInput({ invalid = false, className, ...rest }: Omit<TextInputProps, "type">) {
  const [shown, setShown] = useState(false)
  return (
    <div className="input-wrap">
      <input type={shown ? "text" : "password"} aria-invalid={invalid || undefined} className={cx("input", invalid && "is-error", className)} {...rest} />
      <button type="button" className="icon-btn" aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((s) => !s)}>
        {shown ? <EyeOff size={20} strokeWidth={2} aria-hidden /> : <Eye size={20} strokeWidth={2} aria-hidden />}
      </button>
    </div>
  )
}
