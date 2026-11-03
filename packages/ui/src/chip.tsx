import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

/** `.chip`: 32px, radius-sm; on = brand-blue fill. Used for presets and filters. */
export function Chip({ on = false, className, type = "button", ...rest }: ComponentPropsWithRef<"button"> & { on?: boolean }) {
  return <button type={type} aria-pressed={on} className={cx("chip", on && "is-on", className)} {...rest} />
}
