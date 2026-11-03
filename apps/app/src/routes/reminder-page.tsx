import { Banner, Button, EmptyState, SkeletonList } from "@personal/ui"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import { Check, CircleCheck, RefreshCw } from "lucide-react"
import { useState } from "react"
import type { Stored } from "../data/db"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { timeLabel } from "../ui/format"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { ReminderCard } from "../ui/reminders/reminder-card"
import { finishReminder, snoozeReminder } from "../ui/reminders/snooze"
import { SnoozeOptions } from "../ui/reminders/snooze-options"
import { useOpenTarget } from "../ui/reminders/use-open-target"
import { haptic } from "../ui/haptics"

/** Where a push notification tap lands: the reminder, snooze choices, Done and Open. */
export function ReminderPage() {
  const { occurrenceId } = useParams({ from: "/reminders/$occurrenceId" })
  const search = useSearch({ from: "/reminders/$occurrenceId" })
  const store = useStore()
  const timeZone = useTimeZone()
  const navigate = useNavigate()
  const openTarget = useOpenTarget()
  const [result, setResult] = useState<string | null>(null)
  const reminderId = search.reminder ?? ""
  const reminder = useLiveQuery<Stored<"reminders"> | null>(async () => (reminderId ? ((await store.db.reminders.get(reminderId)) ?? null) : null), [store, reminderId], null)
  const occurrence = useLiveQuery(() => store.db.reminder_occurrences.get(occurrenceId), [store, occurrenceId], undefined)
  const fireAt = search.at ?? reminder?.fire_at ?? ""

  if (!reminder) {
    return (
      <>
        <PageHeader title="Reminder" />
        <Banner tone="info" icon={<RefreshCw aria-hidden />}>
          Loading…
        </Banner>
        <SkeletonList rows={2} />
      </>
    )
  }

  const handled = result ?? (occurrence?.acknowledged_at ? (occurrence.acknowledged_action === "snoozed" ? "Snoozed." : "Done.") : null)

  return (
    <>
      <BackLink to="/" label="Today" />
      <PageHeader title="Reminder" />
      <ReminderCard title={reminder.title} fireAt={fireAt} timeZone={timeZone} />
      {reminder.target_type === "standalone" && reminder.body ? (
        <p className="t-body enter enter-1 m-0 whitespace-pre-wrap" style={{ color: "var(--ink-secondary)" }}>
          {reminder.body}
        </p>
      ) : null}
      {handled ? (
        <EmptyState
          tone="success"
          icon={<CircleCheck size={24} strokeWidth={2} aria-hidden />}
          title={handled}
          action={
            <Button size="sm" onClick={() => void navigate({ to: "/" })}>
              Go to Today
            </Button>
          }
        >
          This reminder is cleared on your other devices too.
        </EmptyState>
      ) : (
        <>
          <h2 className="t-title3 enter enter-1">Snooze until</h2>
          <div className="enter enter-2">
            <SnoozeOptions
              timeZone={timeZone}
              onSnooze={(until) => {
                void snoozeReminder(store, reminder, fireAt, until, timeZone)
                setResult(`Snoozed until ${timeLabel(until, timeZone)}.`)
              }}
            />
          </div>
          <div className="enter enter-3 flex gap-2.5">
            <Button size="xl" className="flex-1" onClick={() => openTarget(reminder.target_type, reminder.target_id)}>
              {reminder.target_type === "note" ? "Open note" : reminder.target_type === "standalone" ? "Edit" : "Open task"}
            </Button>
            <Button
              variant="primary"
              size="xl"
              className="flex-1"
              onClick={() => {
                haptic("success")
                void finishReminder(store, reminder, fireAt, timeZone)
                setResult("Done.")
              }}
            >
              <Check size={18} strokeWidth={2} aria-hidden />
              Done
            </Button>
          </div>
          <p className="t-meta text-center" style={{ fontSize: 12 }}>
            Snoozing here snoozes it on your other devices too.
          </p>
        </>
      )}
    </>
  )
}
