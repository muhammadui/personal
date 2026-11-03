import { Button, EmptyState, List, SectionLabel } from "@personal/ui"
import { useRouter } from "@tanstack/react-router"
import { Bell, BellOff, CloudOff, ShieldCheck } from "lucide-react"
import { markAllNotificationsRead, markNotificationRead } from "../data/actions"
import type { Stored } from "../data/db"
import { notifications } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { dayDiff, relativeTime, timeLabel } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { finishReminder, inMinutes, snoozeReminder } from "../ui/reminders/snooze"
import { useToast } from "../ui/shell/toast-provider"

/** Reminder id and fire time from a notification link like /reminders/<occ>?reminder=<id>&at=<iso>. */
function reminderRef(link: string | null | undefined): { reminderId: string; at: string } | null {
  if (!link) return null
  try {
    const url = new URL(link, "http://local")
    const reminderId = url.searchParams.get("reminder")
    const at = url.searchParams.get("at")
    return reminderId && at ? { reminderId, at } : null
  } catch {
    return null
  }
}

/** PhoneInbox / Inbox: newest first, unread on top with Done / Snooze for reminders. */
export function NotificationsPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const router = useRouter()
  const { showToast } = useToast()
  const items = useLiveQuery(() => notifications(store.db), [store], null)
  const reminders = useLiveQuery(
    async () => {
      const ids = (items ?? []).flatMap((n) => (n.read_at ? [] : [reminderRef(n.link)?.reminderId ?? ""])).filter(Boolean)
      const rows = await store.db.reminders.bulkGet(ids)
      return new Map(rows.flatMap((r) => (r ? [[r.id, r] as const] : [])))
    },
    [store, items],
    new Map<string, Stored<"reminders">>(),
  )

  const unread = (items ?? []).filter((n) => !n.read_at)
  const read = (items ?? []).filter((n) => n.read_at)

  const open = (n: Stored<"notifications">) => {
    if (!n.read_at) void markNotificationRead(store, n.id)
    if (n.link) router.history.push(n.link)
  }

  const row = (n: Stored<"notifications">, i: number) => {
    const ref = reminderRef(n.link)
    const reminder = ref ? reminders.get(ref.reminderId) : undefined
    const tile = n.kind === "reminder" ? (n.read_at ? "tile" : "tile tile-accent") : n.kind === "sync" ? "tile tile-warn" : "tile"
    const icon = n.kind === "reminder" ? <Bell size={18} strokeWidth={2} aria-hidden /> : n.kind === "sync" ? <CloudOff size={18} strokeWidth={2} aria-hidden /> : <ShieldCheck size={18} strokeWidth={2} aria-hidden />
    const when = dayDiff(new Date(n.created_at), now, timeZone) === 0 ? timeLabel(n.created_at, timeZone) : relativeTime(n.created_at, now, timeZone)
    return (
      <div key={n.id} className={`task ${i < 8 ? `enter enter-${i + 1}` : ""}`} style={{ alignItems: "flex-start", padding: "14px 12px" }}>
        {n.read_at ? <span style={{ width: 8, flex: "0 0 8px" }} /> : <span className="unread-dot" aria-label="Unread" />}
        <span className={tile}>{icon}</span>
        <span className="task-body" style={{ gap: 4 }}>
          <button type="button" className="task-open" onClick={() => open(n)}>
            <span className="flex justify-between gap-2">
              <span className="t-body-strong">{n.title}</span>
              <span className="t-meta whitespace-nowrap" style={{ fontSize: 12 }}>
                {when}
              </span>
            </span>
            {n.body ? (
              <span className="t-meta" style={{ fontWeight: 500, color: "var(--ink-secondary)" }}>
                {n.body}
              </span>
            ) : null}
          </button>
          {!n.read_at && reminder && ref && reminder.status === "scheduled" ? (
            <span className="mt-1.5 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  void finishReminder(store, reminder, ref.at, timeZone).then(() => markNotificationRead(store, n.id))
                  showToast({ message: "Done" })
                }}
              >
                Done
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void snoozeReminder(store, reminder, ref.at, inMinutes(15), timeZone).then(() => markNotificationRead(store, n.id))
                  showToast({ message: "Snoozed for 15 minutes" })
                }}
              >
                Snooze 15 min
              </Button>
            </span>
          ) : null}
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="-mx-3 -mb-2 flex items-center md:mx-0">
        <span className="flex-1">
          <BackLink to="/" label="Today" />
        </span>
        {unread.length > 0 ? (
          <Button variant="ghost" size="sm" style={{ color: "var(--text-accent)" }} onClick={() => void markAllNotificationsRead(store)} className="md:hidden">
            Mark all read
          </Button>
        ) : null}
      </div>
      <PageHeader
        title="Notifications"
        actions={
          unread.length > 0 ? (
            <Button variant="ghost" size="sm" style={{ color: "var(--text-accent)" }} className="hidden md:inline-flex" onClick={() => void markAllNotificationsRead(store)}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      {items && items.length === 0 ? (
        <EmptyState icon={<BellOff size={24} strokeWidth={2} aria-hidden />} title="No notifications">
          Reminders and sync notices show up here.
        </EmptyState>
      ) : null}
      {unread.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel className="enter enter-1">Now</SectionLabel>
          <List>{unread.map(row)}</List>
        </section>
      ) : null}
      {read.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel className="enter enter-3">Earlier</SectionLabel>
          <List>{read.map(row)}</List>
        </section>
      ) : null}
    </>
  )
}
