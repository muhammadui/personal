import { ids, nextOccurrence, occurrenceAlerts, type AlertSettings, type PulledRecord } from "@personal/core"

/**
 * Pure reminder scheduling used by the UserHub Durable Object (docs/reminders.md).
 * Kept free of Durable Object APIs so it can be tested in Node.
 */
export type HubReminder = {
  id: string
  title: string
  fireAt: string
  timezone: string
  rule: string | null
  active: boolean
  targetType: string
  targetId: string
  body?: string | null
  alerts?: AlertSettings
  /** Next occurrence not yet pushed; null when finished. */
  nextAt: string | null
}

/** Pushes older than this are not sent; the app shows them as "Missed at <time>". */
export const MISSED_AFTER_MS = 24 * 60 * 60 * 1000
const LATE_GRACE_MS = 60 * 1000

export function reminderFromRecord(rec: PulledRecord): Omit<HubReminder, "nextAt"> {
  const d = rec.data
  return {
    id: rec.id,
    title: String(d.title ?? "Reminder"),
    fireAt: String(d.fire_at),
    timezone: String(d.timezone ?? "Africa/Lagos"),
    rule: typeof d.recurrence_rule === "string" && d.recurrence_rule ? d.recurrence_rule : null,
    active: d.status === "scheduled" && !d.deleted_at,
    targetType: String(d.target_type ?? "task"),
    targetId: String(d.target_id ?? ""),
    body: typeof d.body === "string" && d.body ? d.body : null,
    alerts: {
      alerts_before: Array.isArray(d.alerts_before) ? (d.alerts_before as unknown[]).filter((n): n is number => typeof n === "number") : null,
      nag_every_min: typeof d.nag_every_min === "number" ? d.nag_every_min : null,
      nag_count: typeof d.nag_count === "number" ? d.nag_count : null,
    },
  }
}

/**
 * Where a (new or edited) reminder's schedule starts. A one-off keeps its time even if it is a
 * little in the past (it fires right away, or counts as missed after 24 h). A recurring reminder
 * whose first time is long past starts at its next occurrence from now, so creating a daily
 * reminder never replays old days.
 */
export function initialNextAt(r: Omit<HubReminder, "nextAt">, now: number): string | null {
  if (!r.active) return null
  if (!r.rule) return r.fireAt
  let at: string | null = r.fireAt
  let guard = 0
  while (at && Date.parse(at) < now - LATE_GRACE_MS && guard++ < 10_000) {
    at = nextOccurrence(r.rule, at, r.timezone)
  }
  return at
}

export type DueOccurrence = { reminder: HubReminder; occurrenceId: string; fireAt: string; offsetMin: number; alertKey: string }

const alertsOf = (r: HubReminder, at: string) => occurrenceAlerts(r.id, at, r.alerts ?? {})

/**
 * Collect alerts that are due, and advance each reminder past occurrences whose alerts are all
 * over (or that were acknowledged). An acknowledged occurrence sends nothing more, so Done on
 * one device stops the repeats everywhere. Sent and very old alerts are skipped.
 */
export function collectDue(
  reminders: HubReminder[],
  acked: Set<string>,
  sent: Set<string>,
  now: number,
): { due: DueOccurrence[]; updated: HubReminder[] } {
  const due: DueOccurrence[] = []
  const updated: HubReminder[] = []
  for (const r of reminders) {
    if (!r.active || !r.nextAt) continue
    let at: string | null = r.nextAt
    let changed = false
    let guard = 0
    while (at && guard++ < 10_000) {
      const alerts = alertsOf(r, at)
      const occurrenceId = ids.reminderOccurrence(r.id, at)
      if (!acked.has(occurrenceId) && Date.parse(alerts[0]!.at) > now) break
      if (!acked.has(occurrenceId)) {
        for (const a of alerts) {
          const t = Date.parse(a.at)
          if (t <= now && !sent.has(a.key) && now - t < MISSED_AFTER_MS) due.push({ reminder: r, occurrenceId, fireAt: at, offsetMin: a.offsetMin, alertKey: a.key })
        }
      }
      const finished = acked.has(occurrenceId) || Date.parse(alerts[alerts.length - 1]!.at) <= now
      if (!finished) break
      at = r.rule ? nextOccurrence(r.rule, at, r.timezone) : null
      changed = true
    }
    if (changed) updated.push({ ...r, nextAt: at })
  }
  return { due, updated }
}

/** The next moment an alert is due, or null. Acknowledged occurrences are skipped. */
export function nextAlarmAt(reminders: HubReminder[], acked: Set<string> = new Set(), sent: Set<string> = new Set()): number | null {
  let min: number | null = null
  for (const r of reminders) {
    if (!r.active) continue
    let at = r.nextAt
    let guard = 0
    while (at && guard++ < 1000) {
      if (!acked.has(ids.reminderOccurrence(r.id, at))) {
        const pending = alertsOf(r, at).find((a) => !sent.has(a.key))
        if (pending) {
          const t = Date.parse(pending.at)
          if (min === null || t < min) min = t
          break
        }
      }
      at = r.rule ? nextOccurrence(r.rule, at, r.timezone) : null
    }
  }
  return min
}

/** "4:00 pm" in the reminder's own timezone. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(new Date(iso))
    .replace(/\s?([ap])\.?m\.?/i, " $1m")
}
