import { IconButton } from "@personal/ui"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { monthLabel } from "../format"
import { compareYmd, daysInMonth, sameYmd, weekdayOf, type Ymd } from "./local-date"

const DOW = ["M", "T", "W", "T", "F", "S", "S"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** Month grid starting on Monday. Today is tinted; the chosen day is brand-blue. */
export function MonthCalendar({ value, today, onPick }: { value: Ymd | null; today: Ymd; onPick: (d: Ymd) => void }) {
  const start = value ?? today
  const [view, setView] = useState({ year: start.year, month: start.month })
  const lead = (weekdayOf({ ...view, day: 1 }) + 6) % 7
  const count = daysInMonth(view.year, view.month)
  const shift = (delta: number) =>
    setView((v) => {
      const m = v.month - 1 + delta
      return { year: v.year + Math.floor(m / 12), month: (((m % 12) + 12) % 12) + 1 }
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="t-body-strong">{monthLabel(view.year, view.month)}</span>
        <span className="flex gap-1">
          <IconButton plain label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </IconButton>
          <IconButton plain label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={20} strokeWidth={2} aria-hidden />
          </IconButton>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DOW.map((d, i) => (
          <span key={i} className="t-caption t-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = { ...view, day: i + 1 }
          const on = sameYmd(d, value)
          const isToday = sameYmd(d, today)
          const past = compareYmd(d, today) < 0
          return (
            <button
              key={i}
              type="button"
              aria-label={`${MONTHS[view.month - 1]} ${i + 1}`}
              aria-pressed={on}
              className={`day-btn ${on ? "is-on" : isToday ? "is-today" : past ? "is-past" : ""}`}
              onClick={() => onPick(d)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
