import type { ReminderChoice } from "./due-sheet"

const OFFSET_MIN: Record<Exclude<ReminderChoice, "none">, number> = { at: 0, "15": 15, "60": 60 }

/** Reminder time for a due time and a choice, or null for none. */
export function reminderFireAt(dueAt: string | null, choice: ReminderChoice): string | null {
  if (!dueAt || choice === "none") return null
  return new Date(new Date(dueAt).getTime() - OFFSET_MIN[choice] * 60_000).toISOString()
}

/** Which chip an existing reminder matches, given the due time. */
export function reminderChoiceFor(dueAt: string | null | undefined, fireAt: string | null | undefined): ReminderChoice | "custom" {
  if (!fireAt) return "none"
  if (!dueAt) return "custom"
  const diff = (new Date(dueAt).getTime() - new Date(fireAt).getTime()) / 60_000
  if (diff === 0) return "at"
  if (diff === 15) return "15"
  if (diff === 60) return "60"
  return "custom"
}
