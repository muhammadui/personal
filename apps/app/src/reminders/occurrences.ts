import { ids, nextOccurrence, occurrenceAlerts } from "@personal/core"
import type { Stored } from "../data/db"

export type Occurrence = { reminder: Stored<"reminders">; fireAt: string; occurrenceId: string }

/** How far back an unacknowledged occurrence still shows as "Missed". */
export const MISSED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
/** How far ahead the device sets timers (docs/reminders.md: next 24 hours). */
export const HORIZON_MS = 24 * 60 * 60 * 1000

/**
 * Occurrences of active reminders between now - 7 days and now + 24 h that nobody has
 * acknowledged yet. Pure, so it is tested directly.
 */
export function pendingOccurrences(reminders: Stored<"reminders">[], acked: Set<string>, now: number): Occurrence[] {
  const out: Occurrence[] = []
  for (const r of reminders) {
    if (r.status !== "scheduled" || r.deleted_at) continue
    let at: string | null = r.fire_at
    let guard = 0
    while (at && Date.parse(at) <= now + HORIZON_MS && guard++ < 10_000) {
      if (Date.parse(at) >= now - MISSED_WINDOW_MS) {
        const occurrenceId = ids.reminderOccurrence(r.id, at)
        if (!acked.has(occurrenceId)) out.push({ reminder: r, fireAt: at, occurrenceId })
      }
      at = r.recurrence_rule ? nextOccurrence(r.recurrence_rule, at, r.timezone) : null
    }
  }
  return out.sort((a, b) => a.fireAt.localeCompare(b.fireAt))
}

export type PendingAlert = Occurrence & { offsetMin: number; at: string; key: string }

/**
 * Every alert (early alerts, the time, repeats) of unacknowledged occurrences that is still to
 * come within the next 24 hours. Pure, so it is tested directly.
 */
export function upcomingAlerts(reminders: Stored<"reminders">[], acked: Set<string>, now: number): PendingAlert[] {
  const out: PendingAlert[] = []
  for (const r of reminders) {
    if (r.status !== "scheduled" || r.deleted_at) continue
    let at: string | null = r.fire_at
    let guard = 0
    while (at && guard++ < 10_000) {
      const alerts = occurrenceAlerts(r.id, at, r)
      if (Date.parse(alerts[0]!.at) > now + HORIZON_MS) break
      const occurrenceId = ids.reminderOccurrence(r.id, at)
      if (!acked.has(occurrenceId)) {
        for (const a of alerts) {
          const t = Date.parse(a.at)
          if (t > now && t <= now + HORIZON_MS) out.push({ reminder: r, fireAt: at, occurrenceId, offsetMin: a.offsetMin, at: a.at, key: a.key })
        }
      }
      at = r.recurrence_rule ? nextOccurrence(r.recurrence_rule, at, r.timezone) : null
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/** For a recurring reminder only the latest missed occurrence is worth showing. */
export function latestMissedPerReminder(occ: Occurrence[], now: number): Occurrence[] {
  const latest = new Map<string, Occurrence>()
  for (const o of occ) {
    if (Date.parse(o.fireAt) > now) continue
    const prev = latest.get(o.reminder.id)
    if (!prev || o.fireAt > prev.fireAt) latest.set(o.reminder.id, o)
  }
  return [...latest.values()]
}

export function reminderLink(o: Occurrence): string {
  return `/reminders/${o.occurrenceId}?reminder=${o.reminder.id}&at=${encodeURIComponent(o.fireAt)}`
}

export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(new Date(iso))
    .replace(/\s?([ap])\.?m\.?/i, " $1m")
}
