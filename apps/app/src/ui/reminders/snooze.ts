import { acknowledgeOccurrence } from "../../data/actions"
import type { Stored } from "../../data/db"
import type { Store } from "../../data/store"

export const MINUTE = 60_000

/** Done one reminder occurrence. */
export async function finishReminder(store: Store, reminder: Stored<"reminders">, fireAt: string, timeZone: string): Promise<void> {
  await acknowledgeOccurrence(store, reminder, fireAt, "done", { timeZone })
}

/** Snooze one occurrence until `until` (ISO). */
export async function snoozeReminder(store: Store, reminder: Stored<"reminders">, fireAt: string, until: string, timeZone: string): Promise<void> {
  await acknowledgeOccurrence(store, reminder, fireAt, "snoozed", { snoozeUntil: until, timeZone })
}

export function inMinutes(minutes: number, from = Date.now()): string {
  return new Date(from + minutes * MINUTE).toISOString()
}
