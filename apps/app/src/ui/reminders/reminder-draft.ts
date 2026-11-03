import { utcToZoned } from "@personal/core"
import type { StandaloneReminderInput } from "../../data/actions"
import type { Stored } from "../../data/db"
import { clockLabel, fromInputValues, toInputValues } from "../format"

/** The standalone reminder form's values (quick add and the edit sheet). */
export type ReminderDraft = {
  title: string
  body: string
  /** <input type="date"> value, "2026-11-09". */
  date: string
  /** <input type="time"> value, "16:00". */
  time: string
  /** Early alert presets that are on, in minutes before. */
  before: number[]
  /** The custom early alert in minutes, as typed; null when Custom is off. */
  custom: string | null
  /** "Remind again until I tap Done". */
  nag: boolean
  nagEvery: number
  nagCount: number
  rule: string | null
}

export const EARLY_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
]
export const NAG_EVERY = [1, 2, 5, 10, 15, 30]
export const NAG_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const CUSTOM_MAX = 10_080

/** A new reminder: today (in the user's zone) at the next full hour. */
export function newDraft(now: Date, timeZone: string): ReminderDraft {
  const z = utcToZoned(now, timeZone)
  const minuteStart = Math.floor(now.getTime() / 60_000) * 60_000
  const next = new Date(minuteStart + (60 - z.minute) * 60_000).toISOString()
  const { date, time } = toInputValues(next, timeZone)
  return {
    title: "",
    body: "",
    date,
    time,
    before: [],
    custom: null,
    nag: false,
    nagEvery: 5,
    nagCount: 3,
    rule: null,
  }
}

export function draftFromReminder(r: Stored<"reminders">, timeZone: string): ReminderDraft {
  const { date, time } = toInputValues(r.fire_at, timeZone)
  const all = r.alerts_before ?? []
  const presets = EARLY_PRESETS.map((p) => p.minutes)
  const other = all.find((m) => !presets.includes(m))
  const nag = Boolean(r.nag_every_min && r.nag_count)
  return {
    title: r.title,
    body: r.body ?? "",
    date,
    time,
    before: all.filter((m) => presets.includes(m)),
    custom: other === undefined ? null : String(other),
    nag,
    nagEvery: r.nag_every_min ?? 5,
    nagCount: r.nag_count ?? 3,
    rule: r.recurrence_rule ?? null,
  }
}

/** The custom early alert in whole minutes, or null when it is off or not a valid number. */
export function customMinutes(d: ReminderDraft): number | null {
  if (d.custom === null || !/^\d+$/.test(d.custom.trim())) return null
  const n = Number(d.custom.trim())
  return n >= 1 && n <= CUSTOM_MAX ? n : null
}

/** Every early alert, minutes before, largest first. */
export function draftAlertsBefore(d: ReminderDraft): number[] {
  const custom = customMinutes(d)
  return [...new Set([...d.before, ...(custom === null ? [] : [custom])])].sort((a, b) => b - a)
}

export function draftFireAt(d: ReminderDraft, timeZone: string): string | null {
  if (!/^\d{2}:\d{2}/.test(d.time)) return null
  return fromInputValues(d.date, d.time, timeZone)
}

export const TITLE_MISSING = "Add what to remind you about."

/** What the form is missing, in plain words, or null when it can be saved. */
export function draftProblem(d: ReminderDraft, now: Date, timeZone: string): string | null {
  if (!d.title.trim()) return TITLE_MISSING
  const fireAt = draftFireAt(d, timeZone)
  if (!fireAt) return "Pick a day and a time."
  if (Date.parse(fireAt) <= now.getTime()) return "Pick a time later than now."
  if (d.custom !== null && customMinutes(d) === null)
    return `Custom alert: 1 to ${CUSTOM_MAX} minutes.`
  return null
}

export function draftToInput(d: ReminderDraft, timeZone: string): StandaloneReminderInput | null {
  const fireAt = draftFireAt(d, timeZone)
  if (!fireAt || !d.title.trim()) return null
  return {
    title: d.title.trim(),
    body: d.body.trim() || null,
    fireAt,
    timeZone,
    recurrenceRule: d.rule,
    alertsBefore: draftAlertsBefore(d),
    nagEveryMin: d.nag ? d.nagEvery : null,
    nagCount: d.nag ? d.nagCount : null,
  }
}

/** "5 min", "1 hour", "90 min", "2 hours", "1 day". */
export function minutesLabel(m: number): string {
  if (m % 1440 === 0) return m === 1440 ? "1 day" : `${m / 1440} days`
  if (m % 60 === 0) return m === 60 ? "1 hour" : `${m / 60} hours`
  return `${m} min`
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

/**
 * One plain line about when the alerts come:
 * "Alerts at 3:50, 3:55 and 4:00 pm, then every 5 min up to 3 times until Done."
 */
export function alertSummary(
  fireAt: string,
  before: number[],
  nagEvery: number | null,
  nagCount: number | null,
  timeZone: string,
): string {
  const t = Date.parse(fireAt)
  const offsets = [...new Set(before.filter((m) => m > 0))].sort((a, b) => b - a)
  const clocks = [...offsets.map((m) => t - m * 60_000), t].map((ms) => {
    const z = utcToZoned(new Date(ms), timeZone)
    return clockLabel(z.hour, z.minute)
  })
  // Drop "am"/"pm" when the next time has the same one: "3:50, 3:55 and 4:00 pm".
  const shown = clocks.map((c, i) => {
    const next = clocks[i + 1]
    return next && next.slice(-2) === c.slice(-2) ? c.slice(0, -3) : c
  })
  const head = shown.length === 1 ? `Alert at ${shown[0]}` : `Alerts at ${joinWords(shown)}`
  if (!nagEvery || !nagCount) return `${head}.`
  const tail =
    nagCount === 1
      ? `then once more after ${minutesLabel(nagEvery)} unless you tap Done`
      : `then every ${minutesLabel(nagEvery)} up to ${nagCount} times until Done`
  return `${head}, ${tail}.`
}

/** Short meta for a reminder row: "2 early alerts · Repeats until Done". */
export function alertsShort(
  before: number[] | null | undefined,
  nagEvery: number | null | undefined,
  nagCount: number | null | undefined,
): string {
  const parts: string[] = []
  const n = before?.length ?? 0
  const first = before?.[0]
  if (n === 1 && first !== undefined) parts.push(`Alert ${minutesLabel(first)} before`)
  else if (n > 1) parts.push(`${n} early alerts`)
  if (nagEvery && nagCount) parts.push(`Again every ${minutesLabel(nagEvery)} until Done`)
  return parts.join(" · ")
}
