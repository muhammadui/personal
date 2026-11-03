import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import type { RenderLink } from "./render-link"

export type TabItem = { key: string; label: string; icon: ReactNode; render: RenderLink }

/** `.tabbar`: two tabs, the centre FAB (56×56, brand-blue), two tabs. Labels use caption. */
export function TabBar({ left, right, onFab, fabLabel = "Quick add", className }: { left: TabItem[]; right: TabItem[]; onFab: () => void; fabLabel?: string; className?: string }) {
  const tab = (t: TabItem) => (
    <span key={t.key} className="contents">
      {t.render({
        className: "tab",
        children: (
          <>
            {t.icon}
            {t.label}
          </>
        ),
      })}
    </span>
  )
  return (
    <nav className={`tabbar ${className ?? ""}`} aria-label="Tabs">
      {left.map(tab)}
      <button type="button" className="fab" aria-label={fabLabel} onClick={onFab}>
        <Plus size={26} strokeWidth={2.6} aria-hidden />
      </button>
      {right.map(tab)}
    </nav>
  )
}
