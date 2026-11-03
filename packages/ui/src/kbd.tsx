import type { ReactNode } from "react"

/** `.kbd`: JetBrains Mono 11px keyboard hint. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}
