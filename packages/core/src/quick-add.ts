/** Parse a quick-add task line, e.g. "pay electricity bill tomorrow 6pm". */
import { utcToZoned, zonedToUtc } from "./zoned-time"

export type QuickAddResult = { title: string; dueAt: string | null; dueHasTime: boolean }

type YMD = { year: number; month: number; day: number }

const WEEKDAY_RE = "(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat)"
const MONTH_RE = "(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)"
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

const monthIndex = (s: string): number => MONTHS.indexOf(s.slice(0, 3)) + 1
const weekdayIndex = (s: string): number => WEEKDAYS.indexOf(s.slice(0, 3))

const addDays = (d: YMD, n: number): YMD => {
  const x = new Date(Date.UTC(d.year, d.month - 1, d.day + n))
  return { year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate() }
}
const cmp = (a: YMD, b: YMD): number => (a.year - b.year) * 400 + (a.month - b.month) * 32 + (a.day - b.day)
const validDate = (y: number, m: number, d: number): boolean =>
  m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate()

export const parseQuickAdd = (input: string, now: Date, timeZone: string): QuickAddResult => {
  let text = ` ${input} `
  const z = utcToZoned(now, timeZone)
  const today: YMD = { year: z.year, month: z.month, day: z.day }

  /** Find the first match of `re`, cut it out of the text, and return its groups. */
  const take = (re: RegExp): string[] | null => {
    const m = re.exec(text)
    if (!m) return null
    text = text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)
    return m.map((g) => (g ?? "").toLowerCase())
  }
  const tidy = (): string => text.replace(/\s+/g, " ").trim()

  // 1. Relative offsets: "in 30 minutes", "in 2 days".
  const rel = take(/\s(?:in)\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)(?=\s)/i)
  if (rel) {
    const n = Number(rel[1])
    const unit = (rel[2] ?? "").charAt(0)
    if (unit === "m" || unit === "h") {
      const ms = n * (unit === "m" ? 60_000 : 3_600_000)
      return { title: tidy(), dueAt: new Date(now.getTime() + ms).toISOString(), dueHasTime: true }
    }
    const d = addDays(today, n * (unit === "w" ? 7 : 1))
    return { title: tidy(), dueAt: zonedToUtc({ ...d, hour: 0, minute: 0 }, timeZone).toISOString(), dueHasTime: false }
  }

  // 2. Date: explicit date, or a day word.
  let date: YMD | null = null
  let defaultTime: [number, number] | null = null
  const futureDate = (m: number, d: number): YMD | null => {
    if (!validDate(today.year, m, d)) return validDate(today.year + 1, m, d) ? { year: today.year + 1, month: m, day: d } : null
    const candidate = { year: today.year, month: m, day: d }
    // A date already past this year means next year.
    return cmp(candidate, today) < 0 && validDate(today.year + 1, m, d) ? { ...candidate, year: today.year + 1 } : candidate
  }
  let g: string[] | null
  if ((g = take(new RegExp(`\\s(?:on\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?=\\s)`, "i")))) {
    date = futureDate(monthIndex(g[2] ?? ""), Number(g[1]))
  } else if ((g = take(new RegExp(`\\s(?:on\\s+)?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s)`, "i")))) {
    date = futureDate(monthIndex(g[1] ?? ""), Number(g[2]))
  } else if ((g = take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?=\s)/))) {
    // Day/month, Nigeria style.
    date = futureDate(Number(g[2]), Number(g[1]))
  } else if (take(/\stoday(?=\s)/i)) {
    date = today
  } else if (take(/\stonight(?=\s)/i)) {
    date = today
    defaultTime = [20, 0]
  } else if (take(/\stomorrow(?=\s)/i)) {
    date = addDays(today, 1)
  } else if ((g = take(new RegExp(`\\s(?:on\\s+)?(next\\s+)?${WEEKDAY_RE}(?=\\s)`, "i")))) {
    const target = weekdayIndex(g[2] ?? "")
    if (g[1]) {
      // "next X" = X in the week after this one (weeks start Monday).
      const thisMonday = addDays(today, -((z.weekday + 6) % 7))
      date = addDays(thisMonday, ((target + 6) % 7) + 7)
    } else {
      // Plain "X" = the next X strictly after today.
      date = addDays(today, ((target - z.weekday + 6) % 7) + 1)
    }
  }

  // 3. Time of day.
  let time: [number, number] | null = null
  if (take(/\s(?:at\s+)?noon(?=\s)/i)) time = [12, 0]
  else if (take(/\s(?:at\s+)?midnight(?=\s)/i)) time = [0, 0]
  else if ((g = take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?=\s)/i))) {
    const h = Number(g[1])
    const min = Number(g[2] || 0)
    if (h >= 1 && h <= 12 && min < 60) time = [(h % 12) + (g[3] === "pm" ? 12 : 0), min]
  } else if ((g = take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/))) {
    time = [Number(g[1]), Number(g[2])]
  } else if ((g = take(/\sat\s+(\d{1,2})(?=\s)/i))) {
    // "at 6": bare hour; 1-6 read as pm (nobody means 6am for "at 6"), else 24h.
    const h = Number(g[1])
    if (h <= 23) time = [h >= 1 && h <= 6 ? h + 12 : h, 0]
  }
  time ??= defaultTime

  if (!date && !time) return { title: input.trim(), dueAt: null, dueHasTime: false }

  if (!date && time) {
    // Time alone: today if still ahead, else tomorrow.
    const t = zonedToUtc({ ...today, hour: time[0], minute: time[1] }, timeZone)
    date = t.getTime() > now.getTime() ? today : addDays(today, 1)
  }
  const d = date as YMD
  const due = zonedToUtc({ ...d, hour: time ? time[0] : 0, minute: time ? time[1] : 0 }, timeZone)
  return { title: tidy(), dueAt: due.toISOString(), dueHasTime: time !== null }
}
