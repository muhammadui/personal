import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "outline-inverse"
export type ButtonSize = "sm" | "md" | "lg" | "xl"

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  /** Disables the button and marks it busy; pass a busy label as children ("Signing in…"). */
  busy?: boolean
}

/** `.btn`: 40px (sm 32, lg 48, xl 52), radius-md, press scale 0.97. One primary per view. */
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", block = false): string {
  return cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, block && "btn-block")
}

export function Button({ variant = "secondary", size = "md", block = false, busy = false, disabled, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} disabled={disabled || busy} aria-busy={busy || undefined} className={cx(buttonClass(variant, size, block), className)} {...rest} />
}
