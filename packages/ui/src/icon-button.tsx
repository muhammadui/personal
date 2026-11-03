import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

export type IconButtonProps = ComponentPropsWithRef<"button"> & {
  /** Accessible name; required because the button has no visible text. */
  label: string
  plain?: boolean
  large?: boolean
  /** Small warn dot, e.g. unread notifications. */
  pip?: boolean
}

/** `.icon-btn`: 40×40 (44×44 on mobile), radius-md, 1px line border, press scale 0.94. */
export function IconButton({ label, plain = false, large = false, pip = false, className, type = "button", children, ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cx("icon-btn", plain && "icon-btn-plain", large && "icon-btn-lg", className)} {...rest}>
      {children}
      {pip ? <span className="pip" /> : null}
    </button>
  )
}
