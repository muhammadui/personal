import { Checkbox, List, SectionLabel } from "@personal/ui"
import { Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { addTask, completeTask, reopenTask } from "../../data/actions"
import type { Stored } from "../../data/db"
import { subtasks } from "../../data/queries"
import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"
import { haptic } from "../haptics"

export function SubtaskList({ parent, timeZone, onOpen }: { parent: Stored<"tasks">; timeZone: string; onOpen: (id: string) => void }) {
  const store = useStore()
  const items = useLiveQuery(() => subtasks(store.db, parent.id), [store, parent.id], [])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const doneCount = items.filter((s) => s.status === "done").length

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setAdding(false)
      return
    }
    await addTask(store, { title, parentId: parent.id, listId: parent.list_id ?? null })
    setTitle("")
  }

  return (
    <section className="enter enter-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionLabel as="h3">Subtasks</SectionLabel>
        {items.length ? (
          <span className="t-meta" style={{ fontSize: 12 }}>
            {doneCount} of {items.length}
          </span>
        ) : null}
      </div>
      <List>
        {items.map((s) => {
          const done = s.status === "done"
          return (
            <div key={s.id} className={`task ${done ? "is-done" : ""}`} style={{ minHeight: 48, padding: "4px 12px" }}>
              <Checkbox checked={done} label={done ? `Mark "${s.title}" not done` : `Mark "${s.title}" done`} onToggle={() => {
                  if (!done) haptic("success")
                  void (done ? reopenTask(store, s) : completeTask(store, s, timeZone))
                }} />
              <button type="button" className="task-open" onClick={() => onOpen(s.id)}>
                <span className="task-title" style={{ fontWeight: 500 }}>
                  {s.title || "Untitled"}
                </span>
              </button>
            </div>
          )
        })}
        {adding ? (
          <form onSubmit={(e) => void add(e)} className="task" style={{ minHeight: 48 }}>
            <Plus size={18} strokeWidth={2} aria-hidden style={{ color: "var(--ink-faint)" }} />
            <input
              autoFocus
              className="inline-input t-body"
              placeholder="Subtask"
              aria-label="New subtask"
              enterKeyHint="done"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (!title.trim()) setAdding(false)
              }}
            />
          </form>
        ) : (
          <button type="button" className="task row-btn justify-center" style={{ color: "var(--text-accent)", font: "700 14px/1 var(--font-sans)", minHeight: 48 }} onClick={() => setAdding(true)}>
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add subtask
          </button>
        )}
      </List>
    </section>
  )
}
