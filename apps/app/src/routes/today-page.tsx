import { buttonClass, EmptyState, IconButton, NoteCard, Progress, SectionLabel } from "@personal/ui"
import { Link, useNavigate } from "@tanstack/react-router"
import { CalendarCheck, CircleCheck, Settings } from "lucide-react"
import type { Stored } from "../data/db"
import { notesList, todayTasks } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { endOfLocalDay, startOfLocalDay } from "../data/queries"
import { firstLine, longDateLabel, snippet, timeLabel, editedLabel } from "../ui/format"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { SyncBanner } from "../ui/shell/sync-banner"
import { VerifyBanner } from "../ui/shell/verify-banner"
import { FirstRun } from "../ui/today/first-run"
import { QuickAdd } from "../ui/tasks/quick-add"
import { TaskList } from "../ui/tasks/task-list"

type TodayData = {
  overdue: Stored<"tasks">[]
  today: Stored<"tasks">[]
  doneToday: Stored<"tasks">[]
  upcomingWeek: number
  reminders: Stored<"reminders">[]
  pinned: Stored<"notes">[]
  hasAnything: boolean
  hasNote: boolean
}

/** PhoneToday / Main / FirstToday. */
export function TodayPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const dayKey = longDateLabel(now, timeZone)
  const data = useLiveQuery<TodayData | null>(
    async () => {
      const at = new Date()
      const start = startOfLocalDay(at, timeZone).toISOString()
      const end = endOfLocalDay(at, timeZone).toISOString()
      const weekEnd = endOfLocalDay(at, timeZone, 7).toISOString()
      const [{ overdue, today }, done, open, reminders, notes, taskCount] = await Promise.all([
        todayTasks(store.db, at, timeZone),
        store.db.tasks.where("status").equals("done").filter((t) => !t.deleted_at && !t.parent_id && Boolean(t.completed_at && t.completed_at >= start)).toArray(),
        store.db.tasks.where("status").equals("open").filter((t) => !t.deleted_at && !t.parent_id && Boolean(t.due_at && t.due_at > end && t.due_at <= weekEnd)).count(),
        store.db.reminders.filter((r) => r.status === "scheduled" && !r.deleted_at && r.fire_at >= at.toISOString() && r.fire_at <= end).toArray(),
        notesList(store.db),
        store.db.tasks.filter((t) => !t.deleted_at).count(),
      ])
      return {
        overdue,
        today,
        doneToday: done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
        upcomingWeek: open,
        reminders: reminders.sort((a, b) => a.fire_at.localeCompare(b.fire_at)),
        pinned: notes.filter((n) => n.pinned).slice(0, 2),
        hasAnything: taskCount > 0 || notes.length > 0,
        hasNote: notes.length > 0,
      }
    },
    [store, timeZone, dayKey],
    null,
  )

  if (!data) return <PageHeader eyebrow={dayKey} title="Today" />

  const total = data.overdue.length + data.today.length + data.doneToday.length
  const doneCount = data.doneToday.length
  const nextReminder = data.reminders[0]
  const nothingOpen = data.overdue.length === 0 && data.today.length === 0

  return (
    <>
      <PageHeader
        eyebrow={dayKey}
        title="Today"
        actions={
          <>
            {total > 0 ? (
              <span className="t-meta hidden md:inline">
                {doneCount} of {total} done
              </span>
            ) : null}
            <IconButton large label="Settings" className="md:hidden" onClick={() => void navigate({ to: "/settings" })}>
              <Settings size={20} strokeWidth={2} aria-hidden />
            </IconButton>
            <HeaderStatus />
          </>
        }
      />
      <div className="enter enter-1 flex flex-col gap-3 empty:hidden">
        <SyncBanner />
        <VerifyBanner />
      </div>

      {!data.hasAnything ? (
        <FirstRun hasTask={false} hasNote={data.hasNote} />
      ) : (
        <>
          {total > 0 ? (
            <div className="enter enter-2 flex flex-col gap-2.5 p-4 md:hidden" style={{ borderRadius: "var(--radius-lg)", background: "var(--brand-blue)", color: "var(--ink-on-brand)" }}>
              <span className="flex items-baseline justify-between">
                <span style={{ font: "800 15px/20px var(--font-sans)" }}>
                  {doneCount} of {total} done
                </span>
                {nextReminder ? (
                  <span style={{ font: "700 12px/16px var(--font-sans)", color: "var(--brand-lavender)" }}>Next reminder {timeLabel(nextReminder.fire_at, timeZone)}</span>
                ) : null}
              </span>
              <Progress inverse value={total ? doneCount / total : 0} label="Done today" />
            </div>
          ) : null}
          <QuickAdd timeZone={timeZone} now={now} dueTodayByDefault className="enter enter-1 hidden md:block" />

          <div className="flex flex-wrap items-start gap-6">
            <div className="flex min-w-0 flex-[2_1_520px] flex-col gap-5">
              {data.overdue.length > 0 ? (
                <section className="enter enter-3 flex flex-col gap-2">
                  <SectionLabel warn>Overdue</SectionLabel>
                  <TaskList tasks={data.overdue} now={now} timeZone={timeZone} showList warn />
                </section>
              ) : null}
              {data.today.length > 0 ? (
                <section className="enter enter-4 flex flex-col gap-2">
                  <SectionLabel>
                    <span className="md:hidden">Up next</span>
                    <span className="hidden md:inline">Today</span>
                  </SectionLabel>
                  <TaskList tasks={data.today} now={now} timeZone={timeZone} showList />
                </section>
              ) : null}
              {nothingOpen ? (
                doneCount > 0 ? (
                  <EmptyState
                    tone="success"
                    icon={<CircleCheck size={24} strokeWidth={2} aria-hidden />}
                    title="You're all set"
                    action={
                      <Link to="/upcoming" className={buttonClass("secondary", "sm")}>
                        See upcoming
                      </Link>
                    }
                  >
                    Everything for today is done.{data.upcomingWeek ? ` Upcoming has ${data.upcomingWeek} ${data.upcomingWeek === 1 ? "task" : "tasks"} this week.` : ""}
                  </EmptyState>
                ) : (
                  <EmptyState icon={<CalendarCheck size={24} strokeWidth={2} aria-hidden />} title="Nothing due today">
                    Add a task or write a note. Tap + any time.
                  </EmptyState>
                )
              ) : null}
              {data.doneToday.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <SectionLabel>Done</SectionLabel>
                  <TaskList tasks={data.doneToday} now={now} timeZone={timeZone} showList />
                </section>
              ) : null}
            </div>
            <aside className="hidden min-w-0 flex-[1_1_300px] flex-col gap-5 md:flex">
              {data.reminders.length > 0 ? (
                <section className="panel enter enter-5 flex flex-col gap-3.5">
                  <h2 className="t-title3">Reminders today</h2>
                  <div className="grid items-baseline gap-x-2 gap-y-3" style={{ gridTemplateColumns: "72px 1fr" }}>
                    {data.reminders.map((r, i) => (
                      <span key={r.id} className="contents">
                        <span className={`t-body-strong ${i === 0 ? "t-accent" : "t-muted"}`} style={{ fontSize: 13 }}>
                          {timeLabel(r.fire_at, timeZone)}
                        </span>
                        <span className="t-body">{r.title}</span>
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
              {data.pinned.length > 0 ? (
                <section className="enter enter-6 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="t-title3">Pinned notes</h2>
                    <Link to="/notes" className={buttonClass("ghost", "sm")} style={{ color: "var(--text-accent)" }}>
                      See all
                    </Link>
                  </div>
                  {data.pinned.map((n, i) => (
                    <NoteCard
                      key={n.id}
                      compact
                      colour={i === 0 ? "lilac" : "plain"}
                      title={n.title || firstLine(n.plain_text ?? "") || "Untitled"}
                      preview={snippet(n.plain_text ?? "") || undefined}
                      meta={editedLabel(n.updated_at, now, timeZone)}
                      render={({ className, children }) => (
                        <Link to="/notes/$noteId" params={{ noteId: n.id }} className={className} style={{ minHeight: 0 }}>
                          {children}
                        </Link>
                      )}
                    />
                  ))}
                </section>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </>
  )
}
