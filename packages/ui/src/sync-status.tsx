import { CloudCheck, CloudOff, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"
import { cx } from "./cx"

export type SyncState = "ok" | "busy" | "off"

/** `.sync`: icon + label. Busy spins; ok pops once; off (offline, waiting) is static warn. */
export function SyncStatus({ state, label, pill = false }: { state: SyncState; label: ReactNode; pill?: boolean }) {
  const icon = state === "ok" ? <CloudCheck aria-hidden strokeWidth={2} /> : state === "busy" ? <RefreshCw aria-hidden strokeWidth={2} /> : <CloudOff aria-hidden strokeWidth={2} />
  if (pill) {
    return (
      <span role="status" className={cx("pill-status", state === "off" ? "pill-warn" : "pill-ok", "sync", state === "busy" && "sync-busy")}>
        <span key={state} className="contents">
          {icon}
        </span>
        {label}
      </span>
    )
  }
  return (
    <span role="status" className={cx("sync", `sync-${state}`)}>
      <span key={state} className="contents">
        {icon}
      </span>
      {label}
    </span>
  )
}
