import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

/** Native select styled as `.input`. */
export function SelectInput({ className, ...rest }: ComponentPropsWithRef<"select">) {
  return <select className={cx("input", className)} {...rest} />
}
