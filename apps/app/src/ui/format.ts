import { utcToZoned, zonedToUtc } from "@personal/core"

/** Pure date and text helpers for labels. Every function takes the user's time zone. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_MS = 86_400_000

const pad = (n: number) => String(n).padStart(2, "0")

function localDayNumber(date: Date, timeZone: string): number {
  const z = utcToZoned(date, timeZone)
  return Date.UTC(z.year, z.month - 1, z.day) / DAY_MS
}

/** Whole calendar days from `now` to `date` in the time zone (0 = same day, 1 = tomorrow, -1 = yesterday). */
export function dayDiff(date: Date, now: Date, timeZone: string): number {
  return localDayNumber(date, timeZone) - localDayNumber(now, timeZone)
}

/** "4:00 pm" */
export function timeLabel(iso: string, timeZone: string): string {
  const z = utcToZoned(new Date(iso), timeZone)
  return clockLabel(z.hour, z.minute)
}

/** 16, 0 -> "4:00 pm" */
export function clockLabel(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${pad(minute)} ${hour < 12 ? "am" : "pm"}`
}

const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** "Tuesday, 3 November" */
export function longDateLabel(date: Date, timeZone: string): string {
  const z = utcToZoned(date, timeZone)
  return `${LONG_DAYS[z.weekday]}, ${z.day} ${LONG_MONTHS[z.month - 1]}`
}

/** "November 2026" */
export function monthLabel(year: number, month: number): string {
  return `${LONG_MONTHS[month - 1]} ${year}`
}

/** "Mon 9 Nov", with the year when it is not the current one. */
export function dateLabel(iso: string, now: Date, timeZone: string): string {
  const d = new Date(iso)
  const z = utcToZoned(d, timeZone)
  const n = utcToZoned(now, timeZone)
  const base = `${DAYS[z.weekday]} ${z.day} ${MONTHS[z.month - 1]}`
  return z.year === n.year ? base : `${base} ${z.year}`
}

/** "Today", "Tomorrow", "Yesterday" or "Mon 9 Nov". */
export function dayLabel(iso: string, now: Date, timeZone: string): string {
  const diff = dayDiff(new Date(iso), now, timeZone)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return dateLabel(iso, now, timeZone)
}

/** Due label for a task: "Today, 4:00 pm", "Tomorrow", "Mon 9 Nov". */
export function dueLabel(dueAt: string, hasTime: boolean, now: Date, timeZone: string): string {
  const day = dayLabel(dueAt, now, timeZone)
  return hasTime ? `${day}, ${timeLabel(dueAt, timeZone)}` : day
}

/** A timed task is overdue once its time has passed; a date-only task once its day has passed. */
export function isOverdue(dueAt: string, hasTime: boolean, now: Date, timeZone: string): boolean {
  const due = new Date(dueAt)
  if (hasTime) return due.getTime() < now.getTime()
  return dayDiff(due, now, timeZone) < 0
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "Mon 9 Nov". */
export function relativeTime(iso: string, now: Date, timeZone: string): string {
  const d = new Date(iso)
  const secs = Math.round((now.getTime() - d.getTime()) / 1000)
  if (secs < 45) return "Just now"
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const diff = dayDiff(d, now, timeZone)
  if (diff === 0) return `${Math.round(mins / 60)} h ago`
  if (diff === -1) return "Yesterday"
  return dateLabel(iso, now, timeZone)
}

/** "Edited just now", "Edited 5 min ago", "Edited yesterday", "Edited Tue 20 Oct". */
export function editedLabel(iso: string, now: Date, timeZone: string): string {
  const rel = relativeTime(iso, now, timeZone)
  return `Edited ${rel === "Just now" || rel === "Yesterday" ? rel.toLowerCase() : rel}`
}

/** Split an instant into values for <input type="date"> and <input type="time">. */
export function toInputValues(iso: string, timeZone: string): { date: string; time: string } {
  const z = utcToZoned(new Date(iso), timeZone)
  return { date: `${z.year}-${pad(z.month)}-${pad(z.day)}`, time: `${pad(z.hour)}:${pad(z.minute)}` }
}

/** Combine "2026-11-09" and "16:00" (or "" for start of day) into a UTC ISO string. Null when invalid. */
export function fromInputValues(date: string, time: string, timeZone: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!dm) return null
  const tm = /^(\d{2}):(\d{2})/.exec(time)
  const local = {
    year: Number(dm[1]),
    month: Number(dm[2]),
    day: Number(dm[3]),
    hour: tm ? Number(tm[1]) : 0,
    minute: tm ? Number(tm[2]) : 0,
  }
  return zonedToUtc(local, timeZone).toISOString()
}

/** "Chrome on Mac" from a user agent string. */
export function summariseUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device"
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /CrOS/.test(ua)
              ? "ChromeOS"
              : /Linux/.test(ua)
                ? "Linux"
                : null
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS/.test(ua)
        ? "Firefox"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null
  if (browser && os) return `${browser} on ${os}`
  return browser ?? os ?? "Unknown device"
}

/** First non-empty line, trimmed and capped, for a note title. */
export function firstLine(text: string, max = 500): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? ""
  return line.trim().slice(0, max)
}

/** Text after the first non-empty line, collapsed to one line, for a snippet. */
export function snippet(text: string, max = 140): string {
  const lines = text.split("\n")
  const first = lines.findIndex((l) => l.trim().length > 0)
  if (first === -1) return ""
  return lines
    .slice(first + 1)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}
