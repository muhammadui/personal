import type { ComponentPropsWithRef } from "react"
import { cx } from "./cx"

/** `.card` (or `.panel` with 20px padding). */
export function Card({ panel = false, hover = false, className, ...rest }: ComponentPropsWithRef<"div"> & { panel?: boolean; hover?: boolean }) {
  return <div className={cx(panel ? "panel" : "card", hover && "card-hover", className)} {...rest} />
}
