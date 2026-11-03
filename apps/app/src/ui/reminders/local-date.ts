import { utcToZoned, zonedToUtc } from "@personal/core"

/** Calendar-day helpers in the user's time zone, for the pickers. */
export type Ymd = { year: number; month: number; day: number }

export function todayYmd(now: Date, timeZone: string): Ymd {
  const z = utcToZoned(now, timeZone)
  return { year: z.year, month: z.month, day: z.day }
}

export function addDaysYmd(d: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days))
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }
}

/** 0 = Sunday. */
export function weekdayOf(d: Ymd): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function sameYmd(a: Ymd | null, b: Ymd | null): boolean {
  return Boolean(a && b && a.year === b.year && a.month === b.month && a.day === b.day)
}

export function compareYmd(a: Ymd, b: Ymd): number {
  return Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)
}

export function toUtcIso(d: Ymd, time: { hour: number; minute: number } | null, timeZone: string): string {
  return zonedToUtc({ ...d, hour: time?.hour ?? 0, minute: time?.minute ?? 0 }, timeZone).toISOString()
}

export function fromUtcIso(iso: string, timeZone: string): { date: Ymd; time: { hour: number; minute: number } } {
  const z = utcToZoned(new Date(iso), timeZone)
  return { date: { year: z.year, month: z.month, day: z.day }, time: { hour: z.hour, minute: z.minute } }
}
