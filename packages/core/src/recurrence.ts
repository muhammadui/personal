/** RRULE subset for tasks and reminders: FREQ, INTERVAL, BYDAY (WEEKLY only). */
import { err, ok, type Result } from "./result"
import { utcToZoned, zonedToUtc, type LocalDateTime } from "./zoned-time"

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
export type DayCode = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA"
export type ParsedRule = { freq: Freq; interval: number; byDay: DayCode[] }

/** Index = weekday number (0 = Sunday). */
const DAY_CODES: DayCode[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const FREQS: Freq[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]

// Sort BYDAY Monday-first so formatting is stable.
const mondayFirst = (d: DayCode): number => (DAY_CODES.indexOf(d) + 6) % 7

export const parseRule = (rule: string): Result<ParsedRule, "invalid_rule"> => {
  const bad = (m: string) => err("invalid_rule" as const, m)
  const body = rule.trim().replace(/^RRULE:/i, "")
  if (!body) return bad("Rule is empty")
  const seen = new Map<string, string>()
  for (const part of body.split(";")) {
    const m = /^([A-Z]+)=(.+)$/.exec(part.trim().toUpperCase())
    if (!m) return bad(`Bad part "${part}"`)
    const [, key, value] = m as unknown as [string, string, string]
    if (seen.has(key)) return bad(`Duplicate ${key}`)
    seen.set(key, value)
  }
  for (const key of seen.keys()) {
    if (!["FREQ", "INTERVAL", "BYDAY"].includes(key)) return bad(`Unsupported ${key}`)
  }
  const freq = seen.get("FREQ") as Freq | undefined
  if (!freq || !FREQS.includes(freq)) return bad("FREQ must be DAILY, WEEKLY, MONTHLY or YEARLY")
  let interval = 1
  const iv = seen.get("INTERVAL")
  if (iv !== undefined) {
    if (!/^[1-9]\d{0,3}$/.test(iv)) return bad("INTERVAL must be a positive whole number")
    interval = Number(iv)
  }
  let byDay: DayCode[] = []
  const bd = seen.get("BYDAY")
  if (bd !== undefined) {
    if (freq !== "WEEKLY") return bad("BYDAY is only supported with FREQ=WEEKLY")
    const days = bd.split(",")
    if (days.some((d) => !DAY_CODES.includes(d as DayCode))) return bad("Bad BYDAY value")
    byDay = [...new Set(days as DayCode[])].sort((a, b) => mondayFirst(a) - mondayFirst(b))
  }
  return ok({ freq, interval, byDay })
}

export const formatRule = (parsed: ParsedRule): string => {
  const parts = [`FREQ=${parsed.freq}`]
  if (parsed.interval !== 1) parts.push(`INTERVAL=${parsed.interval}`)
  if (parsed.byDay.length > 0) parts.push(`BYDAY=${parsed.byDay.join(",")}`)
  return parts.join(";")
}

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Calendar arithmetic on a local date (no zone involved). */
const addDays = (l: LocalDateTime, n: number): LocalDateTime => {
  const d = new Date(Date.UTC(l.year, l.month - 1, l.day + n))
  return { ...l, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

const addMonths = (l: LocalDateTime, n: number, anchorDay: number): LocalDateTime => {
  const total = l.year * 12 + (l.month - 1) + n
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return { ...l, year, month, day: Math.min(anchorDay, daysInMonth(year, month)) }
}

export const nextOccurrence = (rule: string, previousIso: string, timeZone: string): string | null => {
  const parsed = parseRule(rule)
  if (!parsed.ok) return null
  const prevMs = Date.parse(previousIso)
  if (Number.isNaN(prevMs)) return null
  const { freq, interval, byDay } = parsed.value
  // Work on the previous occurrence's wall-clock time so the time of day survives DST.
  const z = utcToZoned(new Date(prevMs), timeZone)
  const local: LocalDateTime = { year: z.year, month: z.month, day: z.day, hour: z.hour, minute: z.minute }

  let next: LocalDateTime
  if (freq === "DAILY") next = addDays(local, interval)
  else if (freq === "MONTHLY") next = addMonths(local, interval, local.day)
  else if (freq === "YEARLY") next = addMonths(local, 12 * interval, local.day)
  else if (byDay.length === 0) next = addDays(local, 7 * interval)
  else {
    // Weeks start on Monday. Look for a later selected day in this week first,
    // otherwise jump `interval` weeks ahead and take the first selected day.
    const todayIdx = (z.weekday + 6) % 7
    const wanted = byDay.map(mondayFirst)
    const later = wanted.find((d) => d > todayIdx)
    next = later !== undefined
      ? addDays(local, later - todayIdx)
      : addDays(local, 7 * interval - todayIdx + (wanted[0] as number))
  }
  const result = zonedToUtc(next, timeZone)
  // Guard: never return something at or before the previous occurrence.
  if (result.getTime() <= prevMs) return null
  return result.toISOString()
}

export const describeRule = (rule: string): string => {
  const parsed = parseRule(rule)
  if (!parsed.ok) return "Invalid repeat"
  const { freq, interval, byDay } = parsed.value
  const unit = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year" }[freq]
  const base = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`
  if (byDay.length === 0) return base
  return `${base} on ${byDay.map((d) => DAY_NAMES[DAY_CODES.indexOf(d)]).join(", ")}`
}
