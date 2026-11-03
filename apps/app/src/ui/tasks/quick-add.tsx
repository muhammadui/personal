import { parseQuickAdd } from "@personal/core"
import { Kbd } from "@personal/ui"
import { Plus } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { addTask } from "../../data/actions"
import { inboxId } from "../../data/queries"
import { useStore } from "../../data/session"
import { dueLabel, fromInputValues, toInputValues } from "../format"

type Props = {
  timeZone: string
  now: Date
  /** List for new tasks; the Inbox when not given. */
  listId?: string
  /** Give tasks without a parsed date a due date of today (Today view). */
  dueTodayByDefault?: boolean
  className?: string
}

/** Desktop quick-add bar (Main.dc.html). Press N anywhere to focus it. */
export function QuickAdd({ timeZone, now, listId, dueTodayByDefault = false, className }: Props) {
  const store = useStore()
  const [value, setValue] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  const parsed = value.trim() ? parseQuickAdd(value, now, timeZone) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return
      if (document.querySelector("dialog[open]")) return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!parsed) return
    let { dueAt, dueHasTime } = parsed
    if (!dueAt && dueTodayByDefault) {
      dueAt = fromInputValues(toInputValues(now.toISOString(), timeZone).date, "", timeZone)
      dueHasTime = false
    }
    await addTask(store, { title: parsed.title || value.trim(), listId: listId ?? (await inboxId(store.db)), dueAt, dueHasTime })
    setValue("")
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={className}>
      <label className="searchbox" style={{ height: 52, background: "var(--surface)", padding: "0 16px", boxShadow: "var(--shadow-sm)" }}>
        <span className="flex" style={{ color: "var(--text-accent)" }}>
          <Plus size={20} strokeWidth={2} aria-hidden />
        </span>
        <span className="sr-only">Add a task</span>
        <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a task — try “Pay electricity bill Friday 6pm”" style={{ fontSize: 15 }} enterKeyHint="done" />
        {parsed?.dueAt ? <span className="tag">{dueLabel(parsed.dueAt, parsed.dueHasTime, now, timeZone)}</span> : <Kbd>N</Kbd>}
      </label>
    </form>
  )
}
