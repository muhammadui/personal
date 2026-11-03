import type { Task } from "@personal/core"
import { Badge, Button, Checkbox, IconButton, List, RowButton, Sheet, Switch } from "@personal/ui"
import { Bell, CalendarDays, ChevronLeft, Flag, ListIcon, Repeat, SignalHigh, Trash2, X } from "lucide-react"
import { useState } from "react"
import { cancelReminder, completeTask, reopenTask, setReminder } from "../../data/actions"
import type { Stored } from "../../data/db"
import { activeReminderFor } from "../../data/queries"
import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"
import { dateLabel, dueLabel, fromInputValues, toInputValues } from "../format"
import { useLists } from "../hooks/use-lists"
import { useNow } from "../hooks/use-now"
import { useTimeZone } from "../hooks/use-time-zone"
import { ListDot } from "../lists/list-dot"
import { DueSheet, type DueValue } from "../reminders/due-sheet"
import { reminderChoiceFor, reminderFireAt } from "../reminders/reminder-offset"
import { emitUi } from "../shell/events"
import { useToast } from "../shell/toast-provider"
import { EditableText } from "./editable-text"
import { OptionSheet } from "./option-sheet"
import { repeatShort } from "./repeat-options"
import { RepeatSheet } from "./repeat-sheet"
import { SubtaskList } from "./subtask-list"
import { haptic } from "../haptics"

const PRIORITIES: { value: Task["priority"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

type Props = { taskId: string | null; onClose: () => void; onOpenTask: (id: string) => void }
type Picker = null | "due" | "repeat" | "priority" | "list"

/** PhoneTask / TaskPanel: full screen on phones, side panel on desktop. Every change saves at once. */
export function TaskSheet({ taskId, onClose, onOpenTask }: Props) {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const { lists } = useLists()
  const { showToast } = useToast()
  const [picker, setPicker] = useState<Picker>(null)
  const task = useLiveQuery<Stored<"tasks"> | null | undefined>(async () => (taskId ? ((await store.db.tasks.get(taskId)) ?? null) : null), [store, taskId], undefined)
  const reminder = useLiveQuery(async () => (taskId ? activeReminderFor(store.db, taskId) : undefined), [store, taskId], undefined)
  const current = task && task.id === taskId && !task.deleted_at ? task : null
  const inbox = lists.find((l) => l.is_inbox)
  const list = current ? (lists.find((l) => l.id === current.list_id) ?? inbox) : undefined

  const update = (fields: Partial<Task>) => {
    if (!current) return
    void store.update("tasks", current.id, fields).catch((e: unknown) => console.error("Could not save task", e))
  }

  const saveDue = async (v: DueValue) => {
    if (!current) return
    await store.update("tasks", current.id, { due_at: v.dueAt, due_has_time: v.hasTime })
    const fireAt = reminderFireAt(v.dueAt, v.reminder)
    if (fireAt) {
      await setReminder(store, { type: "task", id: current.id, title: current.title }, fireAt, timeZone)
      emitUi({ type: "notify-prompt", title: current.title, fireAt })
    } else if (reminder) {
      await cancelReminder(store, reminder.id)
    }
  }

  const changeRepeat = (rule: string | null) => {
    if (!current) return
    if (rule && !current.due_at) {
      const today = fromInputValues(toInputValues(now.toISOString(), timeZone).date, "", timeZone)
      update({ recurrence_rule: rule, due_at: today, due_has_time: false })
      return
    }
    update({ recurrence_rule: rule })
  }

  const remove = async () => {
    if (!current) return
    if (reminder) await cancelReminder(store, reminder.id)
    await store.remove("tasks", current.id)
    onClose()
    showToast({ message: "Moved to Trash", actionLabel: "Undo", onAction: () => void store.restore("tasks", current.id) })
  }

  const done = current?.status === "done"
  const choice = reminderChoiceFor(current?.due_at, reminder?.fire_at)
  const reminderText = !reminder
    ? "None"
    : choice === "at"
      ? "At due time"
      : choice === "15"
        ? "15 min before"
        : choice === "60"
          ? "1 hour before"
          : dueLabel(reminder.fire_at, true, now, timeZone)

  return (
    <Sheet open={taskId !== null} onClose={onClose} label="Task details" variant="panel">
      <header className="flex items-center gap-1 px-2 pt-2 pb-2 md:gap-2 md:border-b md:border-line md:px-4 md:pt-4 md:pb-3 md:pl-5">
        <button type="button" className="btn btn-ghost md:hidden" style={{ padding: "0 8px", gap: 2, color: "var(--text-accent)" }} onClick={onClose}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          Back
        </button>
        <span className="t-meta hidden flex-1 md:block">
          {current?.parent_id ? "Subtask" : `${list?.name ?? "Inbox"} · task`}
        </span>
        <span className="flex-1 md:hidden" />
        {current?.parent_id ? (
          <IconButton plain label="Back to parent task" onClick={() => onOpenTask(current.parent_id!)}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </IconButton>
        ) : null}
        <IconButton plain label="Close" className="hidden md:inline-flex" onClick={onClose}>
          <X size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      </header>

      {!current ? (
        <p className="t-meta px-5 py-6">{task === null || (task && task.id === taskId && task.deleted_at) ? "This task was deleted." : "Loading…"}</p>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-1 pb-6 md:pt-5">
            <div className="enter flex items-start gap-3">
              <span style={{ marginTop: 2 }}>
                <Checkbox checked={done} label={done ? "Mark not done" : "Mark done"} onToggle={() => {
                    if (!done) haptic("success")
                    void (done ? reopenTask(store, current) : completeTask(store, current, timeZone))
                  }} />
              </span>
              <EditableText
                key={current.id}
                label="Title"
                value={current.title}
                placeholder="Task"
                onCommit={(title) => update({ title: title.trim() })}
                className={`inline-input t-title2 flex-1 ${done ? "t-faint" : ""}`}
              />
            </div>
            <div className="enter enter-1">
              <EditableText key={`${current.id}-notes`} label="Notes" multiline value={current.notes ?? ""} placeholder="Notes" onCommit={(notes) => update({ notes: notes.trim() ? notes : null })} />
            </div>
            <div className="enter enter-2">
              <List>
                <RowButton icon={<CalendarDays size={20} strokeWidth={2} aria-hidden />} label="Due" value={current.due_at ? dueLabel(current.due_at, current.due_has_time, now, timeZone) : "None"} onClick={() => setPicker("due")} />
                <RowButton icon={<Bell size={20} strokeWidth={2} aria-hidden />} label="Reminder" value={reminderText} onClick={() => setPicker("due")} />
                <RowButton icon={<Repeat size={20} strokeWidth={2} aria-hidden />} label="Repeat" value={repeatShort(current.recurrence_rule)} onClick={() => setPicker("repeat")} />
                <RowButton
                  icon={<SignalHigh size={20} strokeWidth={2} aria-hidden />}
                  label="Priority"
                  value={current.priority === "high" ? <Badge tone="warn">HIGH</Badge> : current.priority === "medium" ? <Badge tone="accent">MEDIUM</Badge> : current.priority === "low" ? "Low" : "None"}
                  onClick={() => setPicker("priority")}
                />
                {!current.parent_id ? (
                  <RowButton
                    icon={<ListIcon size={20} strokeWidth={2} aria-hidden />}
                    label="List"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <ListDot colour={list?.colour} inbox={list?.is_inbox ?? true} />
                        {list?.name ?? "Inbox"}
                      </span>
                    }
                    onClick={() => setPicker("list")}
                  />
                ) : null}
                <div className="task" style={{ minHeight: 52 }}>
                  <span className="flex" style={{ color: "var(--ink-muted)" }}>
                    <Flag size={20} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="task-body">
                    <span className="t-body-strong" style={{ fontWeight: 600 }}>
                      Flagged
                    </span>
                  </span>
                  <Switch label="Flagged" checked={current.flagged} onChange={(flagged) => update({ flagged })} />
                </div>
              </List>
            </div>
            {!current.parent_id ? <SubtaskList parent={current} timeZone={timeZone} onOpen={onOpenTask} /> : null}
            <span className="t-meta mt-auto text-center md:hidden" style={{ fontSize: 12 }}>
              Created {dateLabel(current.created_at, now, timeZone)} · edited {dateLabel(current.updated_at, now, timeZone)}
            </span>
            <Button variant="ghost" className="md:hidden" style={{ color: "var(--danger)" }} onClick={() => void remove()}>
              <Trash2 size={16} strokeWidth={2} aria-hidden />
              Delete
            </Button>
          </div>
          <footer className="hidden items-center justify-between border-t border-line px-5 py-3 md:flex">
            <span className="t-meta" style={{ fontSize: 12 }}>
              {done && current.completed_at ? `Completed ${dateLabel(current.completed_at, now, timeZone)}` : `Created ${dateLabel(current.created_at, now, timeZone)}`}
            </span>
            <Button variant="ghost" size="sm" style={{ color: "var(--danger)" }} onClick={() => void remove()}>
              <Trash2 size={16} strokeWidth={2} aria-hidden />
              Delete
            </Button>
          </footer>

          {picker === "due" ? (
            <DueSheet
              open
              onClose={() => setPicker(null)}
              timeZone={timeZone}
              mode="task"
              initial={{ dueAt: current.due_at ?? null, hasTime: current.due_has_time, reminder: choice === "custom" ? "at" : choice }}
              onSave={(v) => void saveDue(v)}
            />
          ) : null}
          {picker === "repeat" ? (
            <RepeatSheet
              open
              onClose={() => setPicker(null)}
              rule={current.recurrence_rule ?? null}
              dueDay={current.due_at ? Number(toInputValues(current.due_at, timeZone).date.slice(8)) : null}
              onChange={changeRepeat}
            />
          ) : null}
          {picker === "priority" ? <OptionSheet open onClose={() => setPicker(null)} title="Priority" value={current.priority} options={PRIORITIES} onPick={(priority) => update({ priority })} /> : null}
          {picker === "list" ? (
            <OptionSheet
              open
              onClose={() => setPicker(null)}
              title="List"
              value={list?.id ?? ""}
              options={lists.map((l) => ({ value: l.id, label: l.name, leading: <ListDot colour={l.colour} inbox={l.is_inbox} size={12} /> }))}
              onPick={(id) => update({ list_id: id })}
            />
          ) : null}
        </>
      )}
    </Sheet>
  )
}
