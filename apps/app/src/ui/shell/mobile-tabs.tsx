import { TabBar, type TabItem } from "@personal/ui"
import { Link } from "@tanstack/react-router"
import { CalendarDays, FileText, Search, Sun } from "lucide-react"
import { emitUi } from "./events"
import type { NavPath } from "./nav-items"

const ICON = { size: 24, strokeWidth: 2, "aria-hidden": true } as const

function tab(key: string, to: NavPath, label: string, icon: TabItem["icon"], exact = false): TabItem {
  return {
    key,
    label,
    icon,
    render: ({ className, children }) => (
      <Link to={to} className={className} activeOptions={{ exact }} activeProps={{ className: "is-active", "aria-current": "page" }}>
        {children}
      </Link>
    ),
  }
}

/** TabBar.dc.html: Today, Notes, centre FAB (Quick add), Upcoming, Search. Phones only. */
export function MobileTabs() {
  return (
    <div className="md:hidden">
      <TabBar
        className="tabbar-fixed"
        left={[tab("today", "/", "Today", <Sun {...ICON} />, true), tab("notes", "/notes", "Notes", <FileText {...ICON} />)]}
        right={[tab("upcoming", "/upcoming", "Upcoming", <CalendarDays {...ICON} />), tab("search", "/search", "Search", <Search {...ICON} />)]}
        onFab={() => emitUi({ type: "quick-add" })}
      />
    </div>
  )
}
