import type { ReactNode } from "react"
import { cx } from "./cx"
import type { RenderLink } from "./render-link"

export type NavItemProps = {
  icon: ReactNode
  label: ReactNode
  count?: ReactNode
  active?: boolean
  /** Render as a router link; the link should add `is-active` when current. */
  render?: RenderLink
  onClick?: () => void
}

/** `.nav-item`: 36px, radius-md, 18px icon, count on the right; active uses tint-blue. */
export function NavItem({ icon, label, count, active = false, render, onClick }: NavItemProps) {
  const className = cx("nav-item", active && "is-active")
  const children = (
    <>
      {icon}
      <span className="min-w-0 truncate">{label}</span>
      <span className="nav-count">{count}</span>
    </>
  )
  if (render) return <>{render({ className, children })}</>
  return (
    <button type="button" className={cx(className, "w-full border-0 bg-transparent text-left")} onClick={onClick}>
      {children}
    </button>
  )
}
