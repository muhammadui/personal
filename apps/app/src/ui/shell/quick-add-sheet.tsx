import { parseQuickAdd } from "@personal/core"
import { Button, Chip, List, RowButton, SegmentedControl, Sheet } from "@personal/ui"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { CalendarDays, Repeat, SignalHigh } from "lucide-react"
import { useEffect, useState } from "react"
import type { Task } from "@personal/core"
import { addNote, addTask, setReminder } from "../../data/actions"
import { inboxId } from "../../data/queries"
import { useStore } from "../../data/session"
import { openNoteDoc } from "../../sync/note-docs"
import { dueLabel, firstLine, fromInputValues, timeLabel, toInputValues } from "../format"
import { useLists } from "../hooks/use-lists"
import { useTimeZone } from "../hooks/use-time-zone"
import type { ReminderChoice } from "../reminders/due-sheet"
import { reminderFireAt } from "../reminders/reminder-offset"
import { OptionSheet } from "../tasks/option-sheet"
import { repeatShort } from "../tasks/repeat-options"
import { RepeatSheet } from "../tasks/repeat-sheet"
import { emitUi, onUi } from "./events"
import { insertFirstParagraph } from "./insert-first-paragraph"

const PRIORITIES: { value: Task["priority"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

/** PhoneCapture: the FAB (and desktop "Task" button) quick-add sheet for a task or a note. */
export function QuickAddSheet() {
  const store = useStore()
  const timeZone = useTimeZone()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { lists } = useLists()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<"task" | "note">("task")
  const [text, setText] = useState("")
  const [reminder, setReminderChoice] = useState<ReminderChoice>("none")
  const [rule, setRule] = useState<string | null>(null)
  const [priority, setPriority] = useState<Task["priority"]>("none")
  const [picker, setPicker] = useState<null | "repeat" | "priority">(null)

  useEffect(() => onUi((e) => e.type === "quick-add" && setOpen(true)), [])

  const now = new Date()
  const parsed = text.trim() ? parseQuickAdd(text, now, timeZone) : null
  const listMatch = /^\/lists\/([^/]+)$/.exec(pathname)
  const listId = listMatch ? listMatch[1] : null
  const listName = (listId ? lists.find((l) => l.id === listId) : lists.find((l) => l.is_inbox))?.name ?? "Inbox"

  const reset = () => {
    setText("")
    setReminderChoice("none")
    setRule(null)
    setPriority("none")
    setKind("task")
  }
  const close = () => {
    setOpen(false)
    reset()
  }

  const save = async () => {
    if (kind === "note") {
      const id = await addNote(store)
      if (text.trim()) {
        await insertFirstParagraph(openNoteDoc(store, id), text.trim())
        await store.update("notes", id, { title: firstLine(text), plain_text: text.trim() })
      }
      close()
      void navigate({ to: "/notes/$noteId", params: { noteId: id } })
      return
    }
    if (!parsed) return
    let { dueAt, dueHasTime } = parsed
    if (!dueAt && (pathname === "/" || rule)) {
      dueAt = fromInputValues(toInputValues(now.toISOString(), timeZone).date, "", timeZone)
      dueHasTime = false
    }
    const title = parsed.title || text.trim()
    const id = await addTask(store, { title, listId: listId ?? (await inboxId(store.db)), dueAt, dueHasTime, priority, recurrenceRule: rule })
    const fireAt = dueHasTime ? reminderFireAt(dueAt, reminder) : null
    if (fireAt) {
      await setReminder(store, { type: "task", id, title }, fireAt, timeZone)
      emitUi({ type: "notify-prompt", title, fireAt })
    }
    close()
  }

  return (
    <>
      <Sheet open={open} onClose={close} label="Quick add" className="flex flex-col gap-[18px] px-5">
        <SegmentedControl
          label="Type"
          value={kind}
          options={[
            { value: "task", label: "Task" },
            { value: "note", label: "Note" },
          ]}
          onChange={setKind}
        />
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="qa">
            {kind === "task" ? "What do you need to do?" : "Start your note"}
          </label>
          <textarea
            id="qa"
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && kind === "task") {
                e.preventDefault()
                void save()
              }
            }}
            placeholder={kind === "task" ? "Call mum tomorrow 6pm" : "Start writing"}
            className="inline-input resize-none"
            style={{ font: "700 22px/32px var(--font-sans)", minHeight: 64, color: "var(--ink)" }}
          />
          {kind === "task" ? (
            <span className="t-meta fade-in flex items-center gap-1.5" key={parsed?.dueAt ?? "none"}>
              <CalendarDays size={16} strokeWidth={2} aria-hidden />
              {parsed?.dueAt ? `${dueLabel(parsed.dueAt, parsed.dueHasTime, now, timeZone)} · list ${listName}` : `No date · list ${listName}`}
            </span>
          ) : null}
        </div>
        {kind === "task" && parsed?.dueAt && parsed.dueHasTime ? (
          <div className="flex flex-col gap-2.5">
            <span className="t-label">Remind me</span>
            <div className="flex flex-wrap gap-2">
              <Chip on={reminder === "at"} onClick={() => setReminderChoice(reminder === "at" ? "none" : "at")}>
                At {timeLabel(parsed.dueAt, timeZone)}
              </Chip>
              <Chip on={reminder === "15"} onClick={() => setReminderChoice(reminder === "15" ? "none" : "15")}>
                15 min before
              </Chip>
              <Chip on={reminder === "60"} onClick={() => setReminderChoice(reminder === "60" ? "none" : "60")}>
                1 hour before
              </Chip>
            </div>
          </div>
        ) : null}
        {kind === "task" ? (
          <List>
            <RowButton icon={<Repeat size={20} strokeWidth={2} aria-hidden />} label="Repeat" value={repeatShort(rule)} onClick={() => setPicker("repeat")} />
            <RowButton icon={<SignalHigh size={20} strokeWidth={2} aria-hidden />} label="Priority" value={PRIORITIES.find((p) => p.value === priority)?.label} onClick={() => setPicker("priority")} />
          </List>
        ) : null}
        <div className="flex gap-2.5">
          <Button size="xl" className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="xl" className="flex-[2]" disabled={kind === "task" && !parsed} onClick={() => void save()}>
            {kind === "task" ? "Add task" : "Add note"}
          </Button>
        </div>
        <p className="t-meta text-center" style={{ fontSize: 12 }}>
          Saved on this device instantly, even offline.
        </p>
      </Sheet>
      {picker === "repeat" ? <RepeatSheet open onClose={() => setPicker(null)} rule={rule} dueDay={null} onChange={setRule} /> : null}
      {picker === "priority" ? <OptionSheet open onClose={() => setPicker(null)} title="Priority" value={priority} options={PRIORITIES} onPick={setPriority} /> : null}
    </>
  )
}
