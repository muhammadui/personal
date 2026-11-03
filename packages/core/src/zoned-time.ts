/** Timezone helpers built on Intl only (no date libraries). */

export type LocalDateTime = { year: number; month: number; day: number; hour: number; minute: number }
export type ZonedDateTime = LocalDateTime & { weekday: number }

const formatters = new Map<string, Intl.DateTimeFormat>()

const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    })
    formatters.set(timeZone, f)
  }
  return f
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const isValidTimeZone = (tz: string): boolean => {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const partsOf = (date: Date, timeZone: string): ZonedDateTime & { second: number } => {
  const out: Record<string, string> = {}
  for (const p of formatterFor(timeZone).formatToParts(date)) out[p.type] = p.value
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday ?? ""),
  }
}

export const utcToZoned = (date: Date, timeZone: string): ZonedDateTime => {
  const { second: _s, ...rest } = partsOf(date, timeZone)
  return rest
}

/** Offset of the zone from UTC at instant `t`, in ms (positive east of UTC). */
const offsetAt = (t: number, timeZone: string): number => {
  const p = partsOf(new Date(t), timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(t / 1000) * 1000
}

const HOUR = 3_600_000

export const zonedToUtc = (local: LocalDateTime, timeZone: string): Date => {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
  // Offsets either side of the wall time; they differ only near a DST change.
  const before = offsetAt(naive - 12 * HOUR, timeZone)
  const after = offsetAt(naive + 12 * HOUR, timeZone)
  const matches = (t: number): boolean => {
    const z = utcToZoned(new Date(t), timeZone)
    return (
      z.year === local.year && z.month === local.month && z.day === local.day &&
      z.hour === local.hour && z.minute === local.minute
    )
  }
  const candidates = [naive - before, naive - after].filter(matches).sort((a, b) => a - b)
  // Overlap: both match, take the earlier. Normal: one match.
  if (candidates.length > 0) return new Date(candidates[0] as number)
  // Gap: the wall time does not exist. Using the pre-change offset lands on the
  // later valid instant (e.g. 01:30 London on spring-forward day -> 02:30 BST).
  return new Date(naive - before)
}
