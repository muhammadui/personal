import { Bell } from "lucide-react"
import { timeLabel } from "../format"

/** Navy reminder card used in the snooze sheet and the reminder page. */
export function ReminderCard({ title, fireAt, timeZone, missed = false }: { title: string; fireAt: string; timeZone: string; missed?: boolean }) {
  return (
    <div className="enter flex items-center gap-3 p-4" style={{ borderRadius: "var(--radius-lg)", background: "var(--brand-navy)", color: "var(--ink-on-brand)" }}>
      <span className="tile-onbrand">
        <Bell size={20} strokeWidth={2} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span style={{ font: "700 11px/14px var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--brand-lavender)" }}>
          {missed ? `Missed at ${timeLabel(fireAt, timeZone)}` : `Reminder · ${timeLabel(fireAt, timeZone)}`}
        </span>
        <span style={{ font: "700 16px/22px var(--font-sans)" }}>{title}</span>
      </span>
    </div>
  )
}
