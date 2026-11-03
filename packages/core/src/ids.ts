import { v5 as uuidv5, v7 as uuidv7, validate } from "uuid"

/** Fixed namespace for every deterministic id in Personal. Never change it. */
export const PERSONAL_NAMESPACE = "6f1c2a4e-8d3b-5f7a-9c0e-2b4d6f8a1c3e"

export function newId(): string {
  return uuidv7()
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && validate(value)
}

function det(name: string): string {
  return uuidv5(name, PERSONAL_NAMESPACE)
}

/** Canonical ISO form used inside deterministic ids: always UTC with milliseconds. */
export function canonicalIso(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(value)}`)
  return d.toISOString()
}

export const ids = {
  settings: (userId: string) => userId,
  inbox: (userId: string) => det(`${userId}:inbox`),
  nextRecurringTask: (seriesId: string, nextDue: string) => det(`${seriesId}:${canonicalIso(nextDue)}`),
  reminderOccurrence: (reminderId: string, fireAt: string) => det(`${reminderId}:${canonicalIso(fireAt)}`),
  reminderNotification: (occurrenceId: string) => det(`notification:${occurrenceId}`),
}
