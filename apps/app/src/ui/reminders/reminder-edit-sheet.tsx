import { Button, Sheet } from "@personal/ui"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { cancelReminder, updateStandaloneReminder } from "../../data/actions"
import type { Stored } from "../../data/db"
import { useStore } from "../../data/session"
import { useTimeZone } from "../hooks/use-time-zone"
import { useToast } from "../shell/toast-provider"
import { draftFromReminder, draftProblem, draftToInput, type ReminderDraft } from "./reminder-draft"
import { ReminderForm } from "./reminder-form"
import { haptic } from "../haptics"

/** Edit a standalone reminder: the quick add reminder form, prefilled, with Delete. */
export function ReminderEditSheet({ reminder, onClose }: { reminder: Stored<"reminders">; onClose: () => void }) {
  const store = useStore()
  const timeZone = useTimeZone()
  const { showToast } = useToast()
  const [draft, setDraft] = useState<ReminderDraft>(() => draftFromReminder(reminder, timeZone))
  const now = new Date()
  const problem = draftProblem(draft, now, timeZone)

  const save = async () => {
    haptic("success")
    const input = draftToInput(draft, timeZone)
    if (!input || problem) return
    await updateStandaloneReminder(store, reminder.id, input)
    onClose()
    showToast({ message: "Reminder saved" })
  }

  const remove = async () => {
    haptic("warning")
    const before = reminder.status
    await cancelReminder(store, reminder.id)
    onClose()
    showToast({
      message: "Reminder deleted",
      actionLabel: "Undo",
      onAction: () => void store.update("reminders", reminder.id, { status: before }),
    })
  }

  return (
    <Sheet open onClose={onClose} label="Edit reminder" className="flex flex-col gap-[18px] px-5">
      <h2 className="t-title3">Edit reminder</h2>
      <ReminderForm value={draft} onChange={setDraft} timeZone={timeZone} now={now} onSubmit={() => void save()} />
      <div className="flex gap-2.5">
        <Button size="xl" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="xl" className="flex-[2]" disabled={problem !== null} onClick={() => void save()}>
          Save
        </Button>
      </div>
      <Button variant="ghost" style={{ color: "var(--danger)" }} onClick={() => void remove()}>
        <Trash2 size={16} strokeWidth={2} aria-hidden />
        Delete reminder
      </Button>
    </Sheet>
  )
}
