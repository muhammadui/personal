import { EmptyState, IconButton, List, RowButton, SectionLabel, Chip } from "@personal/ui"
import { Link, useNavigate } from "@tanstack/react-router"
import { Bell, CircleCheck, FileText, Flag, ListTodo, Search, Settings, SquareCheck, Trash2, X } from "lucide-react"
import { useState } from "react"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { firstLine, relativeTime } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { useTaskSheet } from "../ui/tasks/task-sheet-provider"

/** PhoneSearch (simple version): titles and text of notes and tasks on this device, plus shortcuts. */
export function SearchPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const { openTask } = useTaskSheet()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "notes" | "tasks">("all")
  const q = query.trim().toLowerCase()
  const results = useLiveQuery(
    async () => {
      if (!q) return { notes: [], tasks: [] }
      const [notes, tasks] = await Promise.all([
        store.db.notes.filter((n) => !n.deleted_at && (n.title.toLowerCase().includes(q) || (n.plain_text ?? "").toLowerCase().includes(q))).limit(30).toArray(),
        store.db.tasks.filter((t) => !t.deleted_at && (t.title.toLowerCase().includes(q) || (t.notes ?? "").toLowerCase().includes(q))).limit(30).toArray(),
      ])
      return { notes, tasks }
    },
    [store, q],
    { notes: [], tasks: [] },
  )
  const total = results.notes.length + results.tasks.length
  const ICON = { size: 20, strokeWidth: 2, "aria-hidden": true } as const

  return (
    <>
      <PageHeader title="Search" />
      <label className="searchbox enter enter-1" style={{ height: 48, background: "var(--surface)" }}>
        <Search size={18} strokeWidth={2} aria-hidden />
        <span className="sr-only">Search everything</span>
        <input type="search" autoFocus placeholder="Search notes and tasks" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query ? (
          <IconButton plain label="Clear search" style={{ width: 32, height: 32 }} onClick={() => setQuery("")}>
            <X size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        ) : null}
      </label>
      {q ? (
        <>
          <div className="enter enter-2 flex gap-2">
            <Chip on={filter === "all"} onClick={() => setFilter("all")}>
              All · {total}
            </Chip>
            <Chip on={filter === "notes"} onClick={() => setFilter("notes")}>
              Notes · {results.notes.length}
            </Chip>
            <Chip on={filter === "tasks"} onClick={() => setFilter("tasks")}>
              Tasks · {results.tasks.length}
            </Chip>
          </div>
          <span className="t-meta enter enter-2" style={{ fontSize: 12 }}>
            Searching on this device · works offline
          </span>
          {total === 0 ? (
            <EmptyState icon={<Search size={24} strokeWidth={2} aria-hidden />} title={`No results for “${query.trim()}”`}>
              Check the spelling, or try fewer words.
            </EmptyState>
          ) : null}
          {filter !== "tasks" && results.notes.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel>Notes</SectionLabel>
              <List>
                {results.notes.map((n) => (
                  <Link key={n.id} to="/notes/$noteId" params={{ noteId: n.id }} className="task" style={{ textDecoration: "none", color: "inherit", alignItems: "flex-start" }}>
                    <span className="tile" style={{ width: 32, height: 32, flexBasis: 32, marginTop: 2 }}>
                      <FileText size={16} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="task-body">
                      <span className="t-body-strong">{n.title || firstLine(n.plain_text ?? "") || "Untitled"}</span>
                      <span className="t-meta" style={{ fontSize: 12 }}>
                        {relativeTime(n.updated_at, now, timeZone)}
                      </span>
                    </span>
                  </Link>
                ))}
              </List>
            </section>
          ) : null}
          {filter !== "notes" && results.tasks.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel>Tasks</SectionLabel>
              <List>
                {results.tasks.map((t) => (
                  <button key={t.id} type="button" className="task row-btn" style={{ alignItems: "flex-start" }} onClick={() => openTask(t.id)}>
                    <span className="tile" style={{ width: 32, height: 32, flexBasis: 32, marginTop: 2 }}>
                      <SquareCheck size={16} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="task-body">
                      <span className="t-body-strong">{t.title || "Untitled"}</span>
                      <span className="t-meta" style={{ fontSize: 12 }}>
                        {t.status === "done" ? "Done" : "Open"}
                      </span>
                    </span>
                  </button>
                ))}
              </List>
            </section>
          ) : null}
        </>
      ) : (
        <section className="enter enter-2 flex flex-col gap-2">
          <SectionLabel>Go to</SectionLabel>
          <List>
            <RowButton icon={<Flag {...ICON} />} label="Flagged" onClick={() => void navigate({ to: "/flagged" })} />
            <RowButton icon={<CircleCheck {...ICON} />} label="Completed" onClick={() => void navigate({ to: "/completed" })} />
            <RowButton icon={<ListTodo {...ICON} />} label="Lists" onClick={() => void navigate({ to: "/lists" })} />
            <RowButton icon={<Bell {...ICON} />} label="Notifications" onClick={() => void navigate({ to: "/notifications" })} />
            <RowButton icon={<Trash2 {...ICON} />} label="Trash" onClick={() => void navigate({ to: "/trash" })} />
            <RowButton icon={<Settings {...ICON} />} label="Settings" onClick={() => void navigate({ to: "/settings" })} />
          </List>
        </section>
      )}
    </>
  )
}
