import { parseRule } from "@personal/core"

export type RepeatMode = "never" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom"

export const REPEAT_MODES: { value: Exclude<RepeatMode, "custom">; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

export const WEEKDAYS = "MO,TU,WE,TH,FR"
export const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function repeatModeOf(rule: string | null | undefined): { mode: RepeatMode; days: string[] } {
  if (!rule) return { mode: "never", days: [] }
  const parsed = parseRule(rule)
  if (!parsed.ok || parsed.value.interval !== 1) return { mode: "custom", days: [] }
  const { freq, byDay } = parsed.value
  if (freq === "DAILY") return { mode: "daily", days: [] }
  if (freq === "MONTHLY") return { mode: "monthly", days: [] }
  if (freq === "YEARLY") return { mode: "yearly", days: [] }
  if (byDay.join(",") === WEEKDAYS) return { mode: "weekdays", days: [] }
  return { mode: "weekly", days: [...byDay] }
}

export function ruleFor(mode: RepeatMode, days: string[]): string | null {
  switch (mode) {
    case "daily":
      return "FREQ=DAILY"
    case "weekdays":
      return `FREQ=WEEKLY;BYDAY=${WEEKDAYS}`
    case "weekly": {
      const ordered = DAY_CODES.filter((d) => days.includes(d))
      return ordered.length ? `FREQ=WEEKLY;BYDAY=${ordered.join(",")}` : "FREQ=WEEKLY"
    }
    case "monthly":
      return "FREQ=MONTHLY"
    case "yearly":
      return "FREQ=YEARLY"
    default:
      return null
  }
}

/** Short label for a task row or detail: "Daily", "Weekdays", "Weekly". */
export function repeatShort(rule: string | null | undefined): string {
  const { mode } = repeatModeOf(rule)
  return { never: "Never", daily: "Daily", weekdays: "Weekdays", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", custom: "Repeats" }[mode]
}
