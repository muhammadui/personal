import { utcToZoned, zonedToUtc } from "@personal/core"
import type { PersonalDb, Stored } from "./db"

/** Plain async selectors over the local database; wrap them in useLiveQuery in screens. */

export const DEFAULT_TIMEZONE = "Africa/Lagos"

export async function getSettings(db: PersonalDb): Promise<Stored<"settings"> | undefined> {
  return db.settings.toCollection().first()
}

export async function getTimeZone(db: PersonalDb): Promise<string> {
  return (await getSettings(db))?.timezone ?? DEFAULT_TIMEZONE
}

/** End of the local day containing `now`, as a UTC instant. */
export function endOfLocalDay(now: Date, timeZone: string, addDays = 0): Date {
  const z = utcToZoned(now, timeZone)
  const startNext = zonedToUtc({ year: z.year, month: z.month, day: z.day + 1 + addDays, hour: 0, minute: 0 }, timeZone)
  return new Date(startNext.getTime() - 1)
}

export function startOfLocalDay(now: Date, timeZone: string): Date {
  const z = utcToZoned(now, timeZone)
  return zonedToUtc({ year: z.year, month: z.month, day: z.day, hour: 0, minute: 0 }, timeZone)
}

const alive = <T extends { deleted_at?: string | null }>(r: T) => !r.deleted_at
const byDueThenOrder = (a: Stored<"tasks">, b: Stored<"tasks">) =>
  (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999") || a.sort_order - b.sort_order

export async function lists(db: PersonalDb): Promise<Stored<"lists">[]> {
  const all = (await db.lists.toArray()).filter(alive)
  return all.sort((a, b) => Number(b.is_inbox) - Number(a.is_inbox) || a.sort_order - b.sort_order)
}

export async function inboxId(db: PersonalDb): Promise<string | null> {
  return (await db.lists.filter((l) => l.is_inbox && !l.deleted_at).first())?.id ?? null
}

export async function openTasks(db: PersonalDb): Promise<Stored<"tasks">[]> {
  return (await db.tasks.where("status").equals("open").toArray()).filter((t) => alive(t) && !t.parent_id)
}

/** Today view: due today or overdue, open. */
export async function todayTasks(db: PersonalDb, now: Date, timeZone: string) {
  const end = endOfLocalDay(now, timeZone).toISOString()
  const start = startOfLocalDay(now, timeZone).toISOString()
  const open = (await openTasks(db)).filter((t) => t.due_at && t.due_at <= end).sort(byDueThenOrder)
  return { overdue: open.filter((t) => t.due_at! < start), today: open.filter((t) => t.due_at! >= start) }
}

export async function upcomingTasks(db: PersonalDb, now: Date, timeZone: string) {
  const end = endOfLocalDay(now, timeZone).toISOString()
  return (await openTasks(db)).filter((t) => t.due_at && t.due_at > end).sort(byDueThenOrder)
}

export async function listTasks(db: PersonalDb, listId: string, isInbox: boolean) {
  const open = await openTasks(db)
  return open.filter((t) => t.list_id === listId || (isInbox && !t.list_id)).sort((a, b) => a.sort_order - b.sort_order)
}

export async function flaggedTasks(db: PersonalDb) {
  return (await openTasks(db)).filter((t) => t.flagged).sort(byDueThenOrder)
}

export async function completedTasks(db: PersonalDb, limit = 200) {
  const done = (await db.tasks.where("status").equals("done").toArray()).filter(alive)
  return done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).slice(0, limit)
}

export async function subtasks(db: PersonalDb, parentId: string) {
  return (await db.tasks.where("parent_id").equals(parentId).toArray()).filter(alive).sort((a, b) => a.sort_order - b.sort_order)
}

export async function notesList(db: PersonalDb) {
  const all = (await db.notes.toArray()).filter(alive)
  return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
}

export async function trash(db: PersonalDb) {
  const [tasks, notes, lists] = await Promise.all([
    db.tasks.filter((t) => Boolean(t.deleted_at)).toArray(),
    db.notes.filter((n) => Boolean(n.deleted_at)).toArray(),
    db.lists.filter((l) => Boolean(l.deleted_at)).toArray(),
  ])
  return { tasks, notes, lists }
}

export async function activeReminderFor(db: PersonalDb, targetId: string) {
  return (await db.reminders.where("target_id").equals(targetId).toArray()).find((r) => r.status === "scheduled" && !r.deleted_at)
}

export async function notifications(db: PersonalDb, limit = 100) {
  const all = (await db.notifications.toArray()).filter(alive)
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)
}

export async function unreadCount(db: PersonalDb) {
  return db.notifications.filter((n) => !n.read_at && !n.deleted_at).count()
}
