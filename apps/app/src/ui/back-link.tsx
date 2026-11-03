import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import type { NavPath } from "./shell/nav-items"

/** Phone header back link in accent ("‹ Today"). Hidden on desktop, where the sidebar is. */
export function BackLink({ to, label }: { to: NavPath; label: string }) {
  return (
    <div className="-mx-3 -mb-2 md:hidden">
      <Link to={to} className="btn btn-ghost" style={{ padding: "0 8px", gap: 2, color: "var(--text-accent)" }}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        {label}
      </Link>
    </div>
  )
}
