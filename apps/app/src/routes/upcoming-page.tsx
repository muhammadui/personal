import { Button, EmptyState, List, RowButton, SectionLabel, Sheet } from "@personal/ui"
import { CalendarDays, Check, ChevronDown } from "lucide-react"
import { useState } from "react"
import type { Stored } from "../data/db"
import { upcomingTasks } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { dateLabel, dayDiff, longDateLabel, monthLabel } from "../ui/format"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { addDaysYmd, todayYmd, toUtcIso, weekdayOf, type Ymd } from "../ui/reminders/local-date"
import { TaskList } from "../ui/tasks/task-list"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS_AHEAD = 6
const DAY_MS = 86_400_000

const daysBetween = (from: Ymd, to: Ymd) => Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS)

/** PhoneUpcoming / Upcoming: a 7-day strip, then open tasks grouped by day. */
export function UpcomingPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const dayKey = longDateLabel(now, timeZone)
  const [picked, setPicked] = useState<number | null>(null)
  /** Months ahead of this one (0 = this month), from the month dropdown. */
  const [monthOffset, setMonthOffset] = useState(0)
  const [choosingMonth, setChoosingMonth] = useState(false)
  const tasks = useLiveQuery(() => upcomingTasks(store.db, new Date(), timeZone), [store, timeZone, dayKey], null)

  const today = todayYmd(now, timeZone)
  const months = Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const m = today.month - 1 + i
    return { year: today.year + Math.floor(m / 12), month: (m % 12) + 1 }
  })
  const shown = months[monthOffset] ?? months[0]!
  // The strip starts tomorrow in this month, or on the 1st of a later month.
  const firstDiff = monthOffset === 0 ? 1 : daysBetween(today, { year: shown.year, month: shown.month, day: 1 })
  const strip = Array.from({ length: 7 }, (_, i) => addDaysYmd(today, firstDiff + i))
  const groups = new Map<number, Stored<"tasks">[]>()
  for (const t of tasks ?? []) {
    const diff = dayDiff(new Date(t.due_at!), now, timeZone)
    groups.set(diff, [...(groups.get(diff) ?? []), t])
  }
  const sections = [...groups.entries()].filter(([diff]) => (picked === null ? diff >= firstDiff : diff === picked))

  const label = (diff: number, sample: Stored<"tasks">) => {
    const date = dateLabel(sample.due_at!, now, timeZone)
    return diff === 1 ? `Tomorrow · ${date}` : date
  }

  return (
    <>
      <PageHeader
        title="Upcoming"
        actions={
          <>
            <Button size="sm" aria-haspopup="dialog" onClick={() => setChoosingMonth(true)}>
              {monthLabel(shown.year, shown.month).replace(` ${today.year}`, "")}
              <ChevronDown size={16} strokeWidth={2} aria-hidden />
            </Button>
            <span className="hidden md:contents">
              <HeaderStatus />
            </span>
          </>
        }
      />
      <div className="enter enter-1 flex gap-1.5">
        {strip.map((d, i) => {
          const diff = firstDiff + i
          const on = picked === diff
          return (
            <button key={diff} type="button" aria-pressed={on} aria-label={dateLabel(toUtcIso(d, { hour: 12, minute: 0 }, timeZone), now, timeZone)} className={`strip-day ${on ? "is-on" : ""}`} onClick={() => setPicked(on ? null : diff)}>
              <span className="strip-dow">{DOW[weekdayOf(d)]}</span>
              <span className="strip-n">{d.day}</span>
              <span className={`strip-dot ${groups.has(diff) ? "has" : ""}`} />
            </button>
          )
        })}
      </div>
      {tasks && sections.length === 0 ? (
        <EmptyState icon={<CalendarDays size={24} strokeWidth={2} aria-hidden />} title={picked === null ? "Nothing coming up" : "Nothing that day"}>
          {picked === null ? "Tasks with a date after today show up here." : "Pick another day, or tap it again to see everything."}
        </EmptyState>
      ) : null}
      <Sheet open={choosingMonth} onClose={() => setChoosingMonth(false)} label="Choose a month">
        <h2 className="t-title3">Choose a month</h2>
        <List>
          {months.map((m, i) => (
            <RowButton
              key={`${m.year}-${m.month}`}
              label={monthLabel(m.year, m.month)}
              chevron={false}
              accent={i === monthOffset}
              value={i === monthOffset ? <Check size={18} strokeWidth={2} aria-label="Selected" /> : undefined}
              onClick={() => {
                setMonthOffset(i)
                setPicked(null)
                setChoosingMonth(false)
              }}
            />
          ))}
        </List>
      </Sheet>
      {sections.map(([diff, list], i) => (
        <section key={diff} className={`flex flex-col gap-2 ${i < 6 ? `enter enter-${i + 2}` : ""}`}>
          <SectionLabel>{label(diff, list[0]!)}</SectionLabel>
          <TaskList tasks={list} now={now} timeZone={timeZone} showList />
        </section>
      ))}
    </>
  )
}
