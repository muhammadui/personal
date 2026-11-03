import { ids } from "@personal/core"
import { liveQuery } from "dexie"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Stored } from "../data/db"
import { useSession } from "../data/session"
import type { Store } from "../data/store"
import { formatClock, latestMissedPerReminder, pendingOccurrences, reminderLink, type Occurrence } from "./occurrences"

export type FiredReminder = { reminder: Stored<"reminders">; fireAt: string; occurrenceId: string; missed: boolean }

const SHOWN_KEY = "personal.shownReminders"

function shownOnThisDevice(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}
function markShown(id: string) {
  const set = shownOnThisDevice()
  set.add(id)
  localStorage.setItem(SHOWN_KEY, JSON.stringify([...set].slice(-500)))
}

/** Record the alert in the synced notification centre (same id on every device). */
async function ensureNotification(store: Store, o: Occurrence, missed: boolean): Promise<void> {
  const id = ids.reminderNotification(o.occurrenceId)
  if (await store.db.notifications.get(id)) return
  const time = formatClock(o.fireAt, o.reminder.timezone)
  await store.create(
    "notifications",
    {
      kind: "reminder",
      title: o.reminder.title,
      body: missed ? `Missed at ${time}` : `Reminder · ${time}`,
      link: reminderLink(o),
      read_at: null,
      occurrence_id: o.occurrenceId,
    },
    id,
  )
}

/** Show a system notification through the service worker, with the same tag Web Push uses. */
async function showSystemNotification(o: Occurrence, missed: boolean): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const time = formatClock(o.fireAt, o.reminder.timezone)
  reg.active?.postMessage({
    type: "show-reminder",
    title: o.reminder.title,
    body: missed ? `Missed at ${time}` : `Reminder · ${time}`,
    url: reminderLink(o),
    tag: o.occurrenceId,
  })
  return true
}

/**
 * Device channel for reminders (docs/reminders.md): while the app is open, set timers for
 * occurrences due in the next 24 hours, re-plan whenever reminders change and every minute,
 * and surface missed ones once.
 */
export function useReminderScheduler(): { toast: FiredReminder | null; dismissToast: () => void } {
  const { store } = useSession()
  const [toast, setToast] = useState<FiredReminder | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    let cancelled = false
    const currentTimers = timers.current

    const fire = async (o: Occurrence, missed: boolean) => {
      if (cancelled || shownOnThisDevice().has(o.occurrenceId)) return
      markShown(o.occurrenceId)
      await ensureNotification(store, o, missed)
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden"
      if (hidden && (await showSystemNotification(o, missed))) return
      setToast({ reminder: o.reminder, fireAt: o.fireAt, occurrenceId: o.occurrenceId, missed })
    }

    const plan = async () => {
      const [reminders, occurrences] = await Promise.all([store.db.reminders.toArray(), store.db.reminder_occurrences.toArray()])
      const acked = new Set(occurrences.filter((o) => o.acknowledged_at).map((o) => o.id))
      const now = Date.now()
      const pending = pendingOccurrences(reminders, acked, now)
      for (const t of currentTimers.values()) clearTimeout(t)
      currentTimers.clear()
      for (const o of latestMissedPerReminder(pending, now)) {
        const missed = now - Date.parse(o.fireAt) > 2 * 60 * 1000
        void fire(o, missed)
      }
      for (const o of pending) {
        const delay = Date.parse(o.fireAt) - now
        if (delay > 0) currentTimers.set(o.occurrenceId, setTimeout(() => void fire(o, false), delay))
      }
    }

    const sub = liveQuery(async () => {
      // Touch both tables so the plan re-runs when either changes.
      await store.db.reminders.count()
      await store.db.reminder_occurrences.count()
      return Date.now()
    }).subscribe({ next: () => void plan(), error: (e: unknown) => console.error("Reminder plan failed", e) })
    const minute = setInterval(() => void plan(), 60_000)

    return () => {
      cancelled = true
      sub.unsubscribe()
      clearInterval(minute)
      for (const t of currentTimers.values()) clearTimeout(t)
      currentTimers.clear()
    }
  }, [store])

  const dismissToast = useCallback(() => setToast(null), [])
  return { toast, dismissToast }
}
