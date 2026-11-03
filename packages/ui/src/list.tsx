import type { ReactNode } from "react"
import { cx } from "./cx"

/** `.list`: surface, 1px line, radius-lg; rows divided by line. */
export function List({ children, warn = false, className }: { children: ReactNode; warn?: boolean; className?: string }) {
  return <div className={cx("list", warn && "list-warn", className)}>{children}</div>
}
