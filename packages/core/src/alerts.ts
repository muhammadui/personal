import { ids } from "./ids"

/**
 * When a reminder occurrence alerts (docs/reminders.md "Alerts"): optional early alerts before
 * the time, the alert at the time, then optional repeats until the occurrence is acknowledged.
 * Shared by the device scheduler and the server's UserHub so both send the same alerts.
 */
export type AlertSettings = {
  alerts_before?: number[] | null
  nag_every_min?: number | null
  nag_count?: number | null
}

export type Alert = {
  /** Minutes relative to the occurrence time: negative = before, 0 = at, positive = repeat. */
  offsetMin: number
  at: string
  /** Unique per alert; the at-time alert keeps the occurrence id (also the notification tag). */
  key: string
}

/** Offsets in minutes, sorted, de-duplicated, always including 0. */
export function alertOffsets(r: AlertSettings): number[] {
  const set = new Set<number>([0])
  for (const m of r.alerts_before ?? []) if (Number.isInteger(m) && m > 0) set.add(-m)
  const every = r.nag_every_min ?? 0
  const count = r.nag_count ?? 0
  if (every > 0) for (let k = 1; k <= count; k++) set.add(k * every)
  return [...set].sort((a, b) => a - b)
}

export function alertKey(occurrenceId: string, offsetMin: number): string {
  return offsetMin === 0 ? occurrenceId : `${occurrenceId}@${offsetMin}`
}

/** Every alert of the occurrence at `fireAt`. */
export function occurrenceAlerts(reminderId: string, fireAt: string, r: AlertSettings): Alert[] {
  const occurrenceId = ids.reminderOccurrence(reminderId, fireAt)
  const t = Date.parse(fireAt)
  return alertOffsets(r).map((offsetMin) => ({ offsetMin, at: new Date(t + offsetMin * 60_000).toISOString(), key: alertKey(occurrenceId, offsetMin) }))
}

/** "In 10 min · 4:00 pm", "Reminder · 4:00 pm", "Reminder again · 4:00 pm". */
export function alertBody(offsetMin: number, clock: string): string {
  if (offsetMin < 0) {
    const m = -offsetMin
    const span = m % 60 === 0 ? `${m / 60} ${m === 60 ? "hour" : "hours"}` : `${m} min`
    return `In ${span} · ${clock}`
  }
  return offsetMin === 0 ? `Reminder · ${clock}` : `Reminder again · ${clock}`
}
