import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

export type TextInputProps = ComponentPropsWithRef<"input"> & { invalid?: boolean }

/** `.input`: 48px, radius-md, line-control border; focus ring; error border. */
export function TextInput({ invalid = false, className, ...rest }: TextInputProps) {
  return <input aria-invalid={invalid || undefined} className={cx("input", invalid && "is-error", className)} {...rest} />
}
