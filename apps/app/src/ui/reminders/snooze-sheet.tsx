import { Button, Sheet } from "@personal/ui"
import { Check } from "lucide-react"
import type { Stored } from "../../data/db"
import { useStore } from "../../data/session"
import { useTimeZone } from "../hooks/use-time-zone"
import { useToast } from "../shell/toast-provider"
import { ReminderCard } from "./reminder-card"
import { finishReminder, snoozeReminder } from "./snooze"
import { SnoozeOptions } from "./snooze-options"
import { useOpenTarget } from "./use-open-target"

type Props = { open: boolean; onClose: () => void; reminder: Stored<"reminders">; fireAt: string; missed?: boolean; onDone?: () => void }

/** PhoneSnooze: the reminder, snooze choices, Open and Done. */
export function SnoozeSheet({ open, onClose, reminder, fireAt, missed = false, onDone }: Props) {
  const store = useStore()
  const timeZone = useTimeZone()
  const openTarget = useOpenTarget()
  const { showToast } = useToast()

  const finish = () => {
    onClose()
    onDone?.()
  }

  return (
    <Sheet open={open} onClose={onClose} label="Snooze">
      <ReminderCard title={reminder.title} fireAt={fireAt} timeZone={timeZone} missed={missed} />
      <h2 className="t-title3 enter enter-1">Snooze until</h2>
      <div className="enter enter-2">
        <SnoozeOptions
          timeZone={timeZone}
          onSnooze={(until) => {
            void snoozeReminder(store, reminder, fireAt, until, timeZone).then(() => showToast({ message: "Snoozed" }))
            finish()
          }}
        />
      </div>
      <div className="enter enter-3 flex gap-2.5">
        <Button
          size="xl"
          className="flex-1"
          onClick={() => {
            openTarget(reminder.target_type, reminder.target_id)
            onClose()
          }}
        >
          {reminder.target_type === "note" ? "Open note" : "Open task"}
        </Button>
        <Button
          variant="primary"
          size="xl"
          className="flex-1"
          onClick={() => {
            void finishReminder(store, reminder, fireAt, timeZone)
            finish()
          }}
        >
          <Check size={18} strokeWidth={2} aria-hidden />
          Done
        </Button>
      </div>
      <p className="t-meta text-center" style={{ fontSize: 12 }}>
        Snoozing here snoozes it on your other devices too.
      </p>
    </Sheet>
  )
}
