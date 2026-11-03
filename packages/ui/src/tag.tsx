import type { ReactNode } from "react"
import { cx } from "./cx"

/** `.tag`: 24px, tint-blue, `#name`. */
export function Tag({ children, outline = false }: { children: ReactNode; outline?: boolean }) {
  return <span className={cx("tag", outline && "tag-outline")}>{children}</span>
}
