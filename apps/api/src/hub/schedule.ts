import { ids, nextOccurrence, type PulledRecord } from "@personal/core"

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

export type DueOccurrence = { reminder: HubReminder; occurrenceId: string; fireAt: string }

/**
 * Collect occurrences that are due, and advance each reminder past them. Acknowledged
 * (done/snoozed elsewhere) and already-sent occurrences are skipped; very old ones are skipped
 * as missed.
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
    while (at && Date.parse(at) <= now && guard++ < 10_000) {
      const occurrenceId = ids.reminderOccurrence(r.id, at)
      if (!acked.has(occurrenceId) && !sent.has(occurrenceId) && now - Date.parse(at) < MISSED_AFTER_MS) {
        due.push({ reminder: r, occurrenceId, fireAt: at })
      }
      at = r.rule ? nextOccurrence(r.rule, at, r.timezone) : null
      changed = true
    }
    if (changed) updated.push({ ...r, nextAt: at })
  }
  return { due, updated }
}

export function nextAlarmAt(reminders: HubReminder[]): number | null {
  let min: number | null = null
  for (const r of reminders) {
    if (!r.active || !r.nextAt) continue
    const t = Date.parse(r.nextAt)
    if (min === null || t < min) min = t
  }
  return min
}

/** "4:00 pm" in the reminder's own timezone. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .format(new Date(iso))
    .replace(/\s?([ap])\.?m\.?/i, " $1m")
}
