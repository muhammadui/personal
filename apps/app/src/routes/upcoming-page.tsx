import { EmptyState, SectionLabel } from "@personal/ui"
import { CalendarDays } from "lucide-react"
import { useState } from "react"
import type { Stored } from "../data/db"
import { upcomingTasks } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { dateLabel, dayDiff, longDateLabel } from "../ui/format"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { addDaysYmd, todayYmd, toUtcIso, weekdayOf } from "../ui/reminders/local-date"
import { TaskList } from "../ui/tasks/task-list"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** PhoneUpcoming / Upcoming: a 7-day strip, then open tasks grouped by day. */
export function UpcomingPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const dayKey = longDateLabel(now, timeZone)
  const [picked, setPicked] = useState<number | null>(null)
  const tasks = useLiveQuery(() => upcomingTasks(store.db, new Date(), timeZone), [store, timeZone, dayKey], null)

  const today = todayYmd(now, timeZone)
  const strip = Array.from({ length: 7 }, (_, i) => addDaysYmd(today, i + 1))
  const groups = new Map<number, Stored<"tasks">[]>()
  for (const t of tasks ?? []) {
    const diff = dayDiff(new Date(t.due_at!), now, timeZone)
    groups.set(diff, [...(groups.get(diff) ?? []), t])
  }
  const sections = [...groups.entries()].filter(([diff]) => picked === null || diff === picked)

  const label = (diff: number, sample: Stored<"tasks">) => {
    const date = dateLabel(sample.due_at!, now, timeZone)
    return diff === 1 ? `Tomorrow · ${date}` : date
  }

  return (
    <>
      <PageHeader title="Upcoming" actions={<HeaderStatus />} />
      <div className="enter enter-1 flex gap-1.5">
        {strip.map((d, i) => {
          const diff = i + 1
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
      {sections.map(([diff, list], i) => (
        <section key={diff} className={`flex flex-col gap-2 ${i < 6 ? `enter enter-${i + 2}` : ""}`}>
          <SectionLabel>{label(diff, list[0]!)}</SectionLabel>
          <TaskList tasks={list} now={now} timeZone={timeZone} showList />
        </section>
      ))}
    </>
  )
}
