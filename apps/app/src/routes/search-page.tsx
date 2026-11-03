import { Chip, EmptyState, IconButton, List, RowButton, SectionLabel } from "@personal/ui"
import { Link, useNavigate } from "@tanstack/react-router"
import { Bell, CircleCheck, FileText, Flag, ListTodo, Lock, Search, Settings, SquareCheck, Trash2, X } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { useSearch } from "../data/use-search"
import { dueLabel, relativeTime } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { Highlighted } from "../ui/search/highlighted"
import { useHitRecords } from "../ui/search/use-hit-records"
import { useTaskSheet } from "../ui/tasks/task-sheet-provider"

type Filter = "all" | "notes" | "tasks"
const ICON = { size: 20, strokeWidth: 2, "aria-hidden": true } as const
const TILE = { width: 32, height: 32, flexBasis: 32, marginTop: 2 } as const
const SNIPPET = { fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)" } as const

/** PhoneSearch: offline full-text search over notes, tasks and tags, with All / Notes / Tasks chips. */
export function SearchPage() {
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const { openTask } = useTaskSheet()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const q = useDeferredValue(query.trim())
  const { hits } = useSearch(q)
  const notes = hits.filter((h) => h.kind === "note").slice(0, 30)
  const tasks = hits.filter((h) => h.kind === "task").slice(0, 30)
  const records = useHitRecords([...notes, ...tasks])
  const total = notes.length + tasks.length

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
              Notes · {notes.length}
            </Chip>
            <Chip on={filter === "tasks"} onClick={() => setFilter("tasks")}>
              Tasks · {tasks.length}
            </Chip>
          </div>
          <span className="t-meta enter enter-2" style={{ fontSize: 12 }}>
            Searching on this device · works offline
          </span>
          {total === 0 ? (
            <EmptyState icon={<Search size={24} strokeWidth={2} aria-hidden />} title={`No results for “${q}”`}>
              Check the spelling, or try fewer words.
            </EmptyState>
          ) : null}
          {filter !== "tasks" && notes.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel className="enter enter-3">Notes</SectionLabel>
              <List>
                {notes.map((h, i) => {
                  const note = records.notes.get(h.id)
                  const locked = note?.locked === true
                  return (
                    <Link key={h.id} to="/notes/$noteId" params={{ noteId: h.id }} className={`task ${i < 5 ? `enter enter-${i + 3}` : ""}`} style={{ textDecoration: "none", color: "inherit", alignItems: "flex-start" }}>
                      <span className={`tile ${locked ? "tile-navy" : ""}`} style={TILE}>
                        {locked ? <Lock size={16} strokeWidth={2} aria-hidden /> : <FileText size={16} strokeWidth={2} aria-hidden />}
                      </span>
                      <span className="task-body">
                        <span className="t-body-strong">
                          <Highlighted text={h.title || "Untitled"} query={q} />
                        </span>
                        {locked ? null : h.snippet ? (
                          <span className="t-meta" style={SNIPPET}>
                            <Highlighted text={h.snippet} query={q} />
                          </span>
                        ) : null}
                        <span className="t-meta" style={{ fontSize: 12 }}>
                          {locked ? "Locked" : note ? relativeTime(note.updated_at, now, timeZone) : ""}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </List>
            </section>
          ) : null}
          {filter !== "notes" && tasks.length > 0 ? (
            <section className="flex flex-col gap-2">
              <SectionLabel className="enter enter-6">Tasks</SectionLabel>
              <List>
                {tasks.map((h, i) => {
                  const task = records.tasks.get(h.id)
                  const meta = h.done ? "Done" : task?.due_at ? dueLabel(task.due_at, task.due_has_time, now, timeZone) : "No date"
                  return (
                    <button key={h.id} type="button" className={`task row-btn ${i < 2 ? `enter enter-${i + 6}` : ""}`} style={{ alignItems: "flex-start" }} onClick={() => openTask(h.id)}>
                      <span className="tile" style={TILE}>
                        {h.done ? <CircleCheck size={16} strokeWidth={2} aria-hidden /> : <SquareCheck size={16} strokeWidth={2} aria-hidden />}
                      </span>
                      <span className="task-body">
                        <span className="t-body-strong">
                          <Highlighted text={h.title || "Untitled"} query={q} />
                        </span>
                        {h.snippet ? (
                          <span className="t-meta" style={SNIPPET}>
                            <Highlighted text={h.snippet} query={q} />
                          </span>
                        ) : null}
                        <span className="t-meta" style={{ fontSize: 12 }}>
                          {meta}
                        </span>
                      </span>
                    </button>
                  )
                })}
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
