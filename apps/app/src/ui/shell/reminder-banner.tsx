import { Button } from "@personal/ui"
import { Bell } from "lucide-react"
import { useState } from "react"
import { useStore } from "../../data/session"
import type { FiredReminder } from "../../reminders/scheduler"
import { timeLabel } from "../format"
import { useTimeZone } from "../hooks/use-time-zone"
import { finishReminder, inMinutes, snoozeReminder } from "../reminders/snooze"
import { SnoozeSheet } from "../reminders/snooze-sheet"

/** Navy reminder banner (Main.dc.html) for a reminder that just fired or was missed. */
export function ReminderBanner({ toast, onDismiss }: { toast: FiredReminder; onDismiss: () => void }) {
  const store = useStore()
  const timeZone = useTimeZone()
  const [more, setMore] = useState(false)
  const { reminder, fireAt, missed } = toast

  return (
    <>
      <section aria-label="Reminder" className="banner banner-navy drop-in flex-wrap" style={{ gap: 16 }}>
        <span className="tile-onbrand">
          <Bell size={20} strokeWidth={2} aria-hidden />
        </span>
        <button type="button" className="flex flex-[1_1_200px] flex-col gap-0.5 border-0 bg-transparent p-0 text-left" style={{ color: "inherit" }} onClick={() => setMore(true)}>
          <span style={{ font: "700 11px/14px var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--brand-lavender)" }}>
            {missed ? `Missed at ${timeLabel(fireAt, timeZone)}` : `Reminder · ${timeLabel(fireAt, timeZone)}`}
          </span>
          <span style={{ font: "700 16px/22px var(--font-sans)" }}>{reminder.title}</span>
        </button>
        <span className="flex gap-2">
          <Button
            variant="outline-inverse"
            onClick={() => {
              void snoozeReminder(store, reminder, fireAt, inMinutes(15), timeZone)
              onDismiss()
            }}
          >
            Snooze 15 min
          </Button>
          <Button
            variant="inverse"
            onClick={() => {
              void finishReminder(store, reminder, fireAt, timeZone)
              onDismiss()
            }}
          >
            Done
          </Button>
        </span>
      </section>
      <SnoozeSheet open={more} onClose={() => setMore(false)} reminder={reminder} fireAt={fireAt} missed={missed} onDone={onDismiss} />
    </>
  )
}
