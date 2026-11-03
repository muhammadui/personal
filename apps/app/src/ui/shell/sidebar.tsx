import { Avatar, Button, Kbd, NavItem, SectionLabel, SyncStatus } from "@personal/ui"
import { Link, useNavigate } from "@tanstack/react-router"
import { BellRing, CalendarDays, CircleCheck, FileText, Flag, Inbox, Plus, Search, Settings, Sun, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import { addNote } from "../../data/actions"
import { todayTasks } from "../../data/queries"
import { useSession } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"
import { BrandMark } from "../brand-mark"
import { useLists } from "../hooks/use-lists"
import { useNow } from "../hooks/use-now"
import { useTimeZone } from "../hooks/use-time-zone"
import { ListDot } from "../lists/list-dot"
import { emitUi } from "./events"
import type { NavPath } from "./nav-items"
import { useSyncLabel } from "./use-sync-label"

const ICON = { size: 18, strokeWidth: 2, "aria-hidden": true } as const

function Item({ to, icon, label, count, exact = false }: { to: NavPath; icon: ReactNode; label: string; count?: number | undefined; exact?: boolean }) {
  return (
    <NavItem
      icon={icon}
      label={label}
      count={count || undefined}
      render={({ className, children }) => (
        <Link to={to} className={className} activeOptions={{ exact }} activeProps={{ className: "is-active", "aria-current": "page" }}>
          {children}
        </Link>
      )}
    />
  )
}

/** Sidebar.dc.html: desktop navigation from 768px. */
export function Sidebar() {
  const { user, store } = useSession()
  const { lists } = useLists()
  const timeZone = useTimeZone()
  const now = useNow(60_000)
  const sync = useSyncLabel()
  const navigate = useNavigate()
  const today = useLiveQuery(() => todayTasks(store.db, new Date(), timeZone), [store, timeZone, now.getUTCHours()], null)
  const notesCount = useLiveQuery(() => store.db.notes.filter((n) => !n.deleted_at).count(), [store], 0)
  const inbox = lists.find((l) => l.is_inbox)

  return (
    <nav aria-label="Main" className="sidebar sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-y-auto md:flex">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <BrandMark />
      </div>
      <Link to="/search" className="searchbox" style={{ textDecoration: "none" }}>
        <Search size={16} strokeWidth={2} aria-hidden />
        <span className="flex-1" style={{ font: "500 14px/1 var(--font-sans)", color: "var(--ink-faint)" }}>
          Search
        </span>
        <Kbd>/</Kbd>
      </Link>
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => {
            void addNote(store).then((id) => navigate({ to: "/notes/$noteId", params: { noteId: id } }))
          }}
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
          Note
        </Button>
        <Button className="flex-1" onClick={() => emitUi({ type: "quick-add" })}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Task
        </Button>
      </div>
      <div className="nav-group">
        <Item to="/" exact icon={<Sun {...ICON} />} label="Today" count={today ? today.overdue.length + today.today.length : undefined} />
        <Item to="/upcoming" icon={<CalendarDays {...ICON} />} label="Upcoming" />
        {inbox ? (
          <NavItem
            icon={<Inbox {...ICON} />}
            label="Inbox"
            count={inbox.openCount || undefined}
            render={({ className, children }) => (
              <Link to="/lists/$listId" params={{ listId: inbox.id }} className={className} activeProps={{ className: "is-active", "aria-current": "page" }}>
                {children}
              </Link>
            )}
          />
        ) : null}
        <Item to="/reminders" icon={<BellRing {...ICON} />} label="Reminders" />
        <Item to="/flagged" icon={<Flag {...ICON} />} label="Flagged" />
        <Item to="/completed" icon={<CircleCheck {...ICON} />} label="Completed" />
      </div>
      <div className="nav-group">
        <SectionLabel as="span">Notes</SectionLabel>
        <Item to="/notes" icon={<FileText {...ICON} />} label="All notes" count={notesCount} />
        <Item to="/trash" icon={<Trash2 {...ICON} />} label="Trash" />
      </div>
      <div className="nav-group">
        <SectionLabel as="span">Lists</SectionLabel>
        {lists
          .filter((l) => !l.is_inbox)
          .map((l) => (
            <NavItem
              key={l.id}
              icon={<ListDot colour={l.colour} inset />}
              label={l.name}
              count={l.openCount || undefined}
              render={({ className, children }) => (
                <Link to="/lists/$listId" params={{ listId: l.id }} className={className} activeProps={{ className: "is-active", "aria-current": "page" }}>
                  {children}
                </Link>
              )}
            />
          ))}
        <Item to="/lists" exact icon={<Plus {...ICON} />} label="Lists" />
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <Item to="/settings" icon={<Settings {...ICON} />} label="Settings" />
        <div className="flex items-center gap-2.5 border-t border-line px-2 pt-3">
          <Avatar name={user.name || user.email} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="t-body-strong truncate" style={{ fontSize: 14 }}>
              {user.name || user.email}
            </span>
            {sync.needsSignIn ? (
              <button type="button" className="sync sync-off border-0 bg-transparent p-0 text-left" onClick={() => emitUi({ type: "session-expired" })}>
                Sign in again
              </button>
            ) : (
              <SyncStatus state={sync.state} label={sync.label} />
            )}
          </span>
        </div>
      </div>
    </nav>
  )
}
