import type { ReactNode } from "react"
import { cx } from "./cx"

export type BannerTone = "warn" | "info" | "success" | "danger" | "navy"

export type BannerProps = {
  tone: BannerTone
  icon?: ReactNode
  /** Bold first line; omit for a one-line banner. */
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** `.banner`: radius-lg, icon + one or two lines + optional action. Offline/unsynced use warn. */
export function Banner({ tone, icon, title, children, action, className }: BannerProps) {
  return (
    <div className={cx("banner", `banner-${tone}`, className)} role={tone === "danger" ? "alert" : "status"} style={title ? { alignItems: "flex-start", padding: "14px 16px" } : undefined}>
      {icon}
      {title ? (
        <span className="flex flex-1 flex-col gap-0.5">
          <span style={{ fontWeight: 800 }}>{title}</span>
          {children ? <span style={{ fontWeight: 600, opacity: 0.9 }}>{children}</span> : null}
        </span>
      ) : (
        <span className="flex-1">{children}</span>
      )}
      {action}
    </div>
  )
}
