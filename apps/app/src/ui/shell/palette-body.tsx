import { Kbd } from "@personal/ui"
import { useNavigate } from "@tanstack/react-router"
import { CalendarDays, FileText, Keyboard, Lock, type LucideIcon, Plus, RefreshCw, Search, Settings, SquareCheck, Sun, Trash2 } from "lucide-react"
import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useSearch } from "../../data/use-search"
import { dueLabel, relativeTime } from "../format"
import { useNow } from "../hooks/use-now"
import { useTimeZone } from "../hooks/use-time-zone"
import { useHitRecords } from "../search/use-hit-records"
import { useTaskSheet } from "../tasks/task-sheet-provider"
import type { ShortcutAction } from "./shortcut-keys"

type Command = { id: string; label: string; icon: LucideIcon; keys: string[]; action: ShortcutAction | "go-trash" }
type Row = { key: string; group: "Notes" | "Tasks" | "Actions"; label: string; icon: LucideIcon; meta?: string; keys?: string[]; run: () => void }

/** The palette's contents. Mounted only while the palette is open, so search runs only then. */
export function PaletteBody({ onClose, run, mod }: { onClose: () => void; run: (action: ShortcutAction | "go-trash") => void; mod: string }) {
  const navigate = useNavigate()
  const { openTask } = useTaskSheet()
  const timeZone = useTimeZone()
  const now = useNow()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const q = useDeferredValue(query.trim())
  const { hits } = useSearch(q)
  const notes = hits.filter((h) => h.kind === "note").slice(0, 5)
  const tasks = hits.filter((h) => h.kind === "task").slice(0, 5)
  const records = useHitRecords([...notes, ...tasks])

  const commands: Command[] = useMemo(
    () => [
      { id: "new-task", label: "New task", icon: Plus, keys: ["N"], action: "new-task" },
      { id: "new-note", label: "New note", icon: FileText, keys: [mod, "N"], action: "new-note" },
      { id: "sync", label: "Sync now", icon: RefreshCw, keys: [mod, "S"], action: "sync" },
      { id: "today", label: "Go to Today", icon: Sun, keys: ["G", "T"], action: "go-today" },
      { id: "upcoming", label: "Go to Upcoming", icon: CalendarDays, keys: ["G", "U"], action: "go-upcoming" },
      { id: "notes", label: "Go to Notes", icon: FileText, keys: ["G", "N"], action: "go-notes" },
      { id: "settings", label: "Go to Settings", icon: Settings, keys: [mod, ","], action: "go-settings" },
      { id: "trash", label: "Go to Trash", icon: Trash2, keys: [], action: "go-trash" },
      { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard, keys: ["?"], action: "shortcuts" },
    ],
    [mod],
  )

  const close = () => onClose()
  const lower = q.toLowerCase()
  const rows: Row[] = [
    ...notes.map((h): Row => {
      const note = records.notes.get(h.id)
      return {
        key: `n:${h.id}`,
        group: "Notes",
        label: h.title || "Untitled",
        icon: note?.locked ? Lock : FileText,
        meta: note?.locked ? "Locked" : note ? relativeTime(note.updated_at, now, timeZone) : "",
        run: () => void navigate({ to: "/notes/$noteId", params: { noteId: h.id } }),
      }
    }),
    ...tasks.map((h): Row => {
      const task = records.tasks.get(h.id)
      return {
        key: `t:${h.id}`,
        group: "Tasks",
        label: h.title || "Untitled",
        icon: SquareCheck,
        meta: h.done ? "Done" : task?.due_at ? dueLabel(task.due_at, task.due_has_time, now, timeZone) : "",
        run: () => openTask(h.id),
      }
    }),
    ...commands
      .filter((c) => !lower || c.label.toLowerCase().includes(lower))
      .map((c): Row => ({ key: `c:${c.id}`, group: "Actions", label: c.label, icon: c.icon, keys: c.keys, run: () => run(c.action) })),
  ]
  const current = Math.min(active, Math.max(rows.length - 1, 0))

  const choose = (row: Row | undefined) => {
    if (!row) return
    close()
    row.run()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((current + 1) % Math.max(rows.length, 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((current - 1 + rows.length) % Math.max(rows.length, 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      choose(rows[current])
    }
  }

  useEffect(() => {
    document.getElementById(`palette-row-${current}`)?.scrollIntoView({ block: "nearest" })
  }, [current])

  let lastGroup: Row["group"] | null = null
  return (
    <>
      <label className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line px-5" style={{ color: "var(--ink-muted)" }}>
        <Search size={20} strokeWidth={2} aria-hidden />
        <span className="sr-only">Search or run a command</span>
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={rows.length ? `palette-row-${current}` : undefined}
          placeholder="Search or run a command"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKey}
          className="min-w-0 flex-1 border-0 bg-transparent outline-none"
          style={{ font: "600 18px/1 var(--font-sans)", color: "var(--ink)" }}
        />
        <Kbd>esc</Kbd>
      </label>
      <div id="palette-list" role="listbox" aria-label="Results" className="flex min-h-0 flex-col gap-0.5 overflow-y-auto py-2">
        {rows.length === 0 ? <p className="t-meta px-6 py-4">No results for “{q}”. Check the spelling, or try fewer words.</p> : null}
        {rows.map((row, i) => {
          const header = row.group !== lastGroup
          lastGroup = row.group
          const Icon = row.icon
          return (
            <div key={row.key} className="contents">
              {header ? (
                <span className="t-label" style={{ padding: i === 0 ? "8px 24px 4px" : "12px 24px 4px" }} aria-hidden>
                  {row.group}
                </span>
              ) : null}
              <button
                id={`palette-row-${i}`}
                type="button"
                role="option"
                aria-selected={i === current}
                tabIndex={-1}
                className={`palette-row ${i === current ? "is-active" : ""}`}
                onMouseMove={() => i !== current && setActive(i)}
                onClick={() => choose(row)}
              >
                <Icon size={18} strokeWidth={2} aria-hidden />
                <span className="flex-1 truncate">{row.label}</span>
                {row.meta ? (
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {row.meta}
                  </span>
                ) : null}
                {row.keys && row.keys.length > 0 ? (
                  <span className="flex gap-1">
                    {row.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                ) : null}
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex shrink-0 gap-4 border-t border-line px-5 py-3" style={{ background: "var(--surface-sunken)" }}>
        <span className="t-meta" style={{ fontSize: 12 }}>
          ↑↓ to move
        </span>
        <span className="t-meta" style={{ fontSize: 12 }}>
          ↵ to open
        </span>
        <span className="t-meta" style={{ fontSize: 12 }}>
          esc to close
        </span>
      </div>
    </>
  )
}
