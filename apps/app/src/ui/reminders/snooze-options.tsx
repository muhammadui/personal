import { List } from "@personal/ui"
import { ChevronRight } from "lucide-react"
import { useState } from "react"
import { dueLabel, timeLabel } from "../format"
import { DueSheet } from "./due-sheet"
import { addDaysYmd, fromUtcIso, todayYmd, toUtcIso } from "./local-date"
import { inMinutes } from "./snooze"

/** The "Snooze until" list from PhoneSnooze. */
export function SnoozeOptions({ timeZone, onSnooze }: { timeZone: string; onSnooze: (until: string) => void }) {
  const [picking, setPicking] = useState(false)
  const now = new Date()
  const today = todayYmd(now, timeZone)
  const hourNow = fromUtcIso(now.toISOString(), timeZone).time.hour
  const options: { label: string; until: string; showDay?: boolean }[] = [
    { label: "5 minutes", until: inMinutes(5) },
    { label: "15 minutes", until: inMinutes(15) },
    { label: "1 hour", until: inMinutes(60) },
  ]
  if (hourNow < 17) options.push({ label: "This evening", until: toUtcIso(today, { hour: 18, minute: 0 }, timeZone) })
  options.push({ label: "Tomorrow morning", until: toUtcIso(addDaysYmd(today, 1), { hour: 9, minute: 0 }, timeZone), showDay: true })

  return (
    <>
      <List>
        {options.map((o) => (
          <button key={o.label} type="button" className="task row-btn" style={{ minHeight: 52 }} onClick={() => onSnooze(o.until)}>
            <span className="task-body">
              <span className="t-body-strong" style={{ fontWeight: 600 }}>
                {o.label}
              </span>
            </span>
            <span className="t-meta">{o.showDay ? dueLabel(o.until, true, now, timeZone) : timeLabel(o.until, timeZone)}</span>
          </button>
        ))}
        <button type="button" className="task row-btn" style={{ minHeight: 52, color: "var(--text-accent)" }} onClick={() => setPicking(true)}>
          <span className="task-body">
            <span className="t-body-strong">Pick a time</span>
          </span>
          <ChevronRight size={18} strokeWidth={2} aria-hidden />
        </button>
      </List>
      <DueSheet
        open={picking}
        onClose={() => setPicking(false)}
        timeZone={timeZone}
        mode="reminder"
        title="Snooze until"
        initial={{ dueAt: inMinutes(60), hasTime: true, reminder: "at" }}
        onSave={(v) => {
          if (v.dueAt) onSnooze(v.dueAt)
        }}
      />
    </>
  )
}

