import type { ReactNode } from "react"

/** `.badge`: 20px uppercase label, e.g. HIGH or THIS DEVICE. */
export function Badge({ tone = "accent", children }: { tone?: "warn" | "accent" | "success"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
