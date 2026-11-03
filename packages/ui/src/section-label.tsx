import type { ReactNode } from "react"
import { cx } from "./cx"

/** `.t-label`: uppercase 12px section heading; `warn` for Overdue. */
export function SectionLabel({ children, warn = false, as: Tag = "h2", className }: { children: ReactNode; warn?: boolean; as?: "h2" | "h3" | "span"; className?: string }) {
  return <Tag className={cx("t-label", warn && "t-warn", className)}>{children}</Tag>
}
