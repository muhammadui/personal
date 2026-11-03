import type { ReactNode } from "react"
import { cx } from "./cx"

/** Empty state panel from States.dc.html: icon tile, title, one line, optional action. */
export function EmptyState({ icon, tone = "plain", title, children, action, bare = false }: { icon: ReactNode; tone?: "plain" | "success" | "accent"; title: ReactNode; children?: ReactNode; action?: ReactNode; bare?: boolean }) {
  return (
    <div className={cx(bare ? "fade-in" : "panel fade-in", "flex flex-col items-center justify-center gap-2.5 text-center")} style={{ minHeight: bare ? undefined : 240, padding: bare ? "48px 0" : undefined }}>
      <span className={cx("tile tile-lg", tone === "success" && "tile-success", tone === "accent" && "tile-accent")}>{icon}</span>
      <h3 className="t-title3">{title}</h3>
      {children ? (
        <p className="t-meta" style={{ maxWidth: 260 }}>
          {children}
        </p>
      ) : null}
      {action}
    </div>
  )
}
