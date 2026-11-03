import { ids, newId, nextOccurrence, type Task } from "@personal/core"
import type { Stored } from "./db"
import type { Store } from "./store"

/**
 * Domain operations used by the screens. Every one of them goes through Store.write, so each
 * change is one record update + one outbox entry in one transaction.
 */

export type NewTask = {
  title: string
  listId?: string | null
  dueAt?: string | null
  dueHasTime?: boolean
  priority?: Task["priority"]
  recurrenceRule?: string | null
  parentId?: string | null
  notes?: string | null
}

export async function addTask(store: Store, t: NewTask): Promise<string> {
  return store.create("tasks", {
    list_id: t.listId ?? null,
    parent_id: t.parentId ?? null,
    note_id: null,
    title: t.title.trim(),
    notes: t.notes ?? null,
    due_at: t.dueAt ?? null,
    due_has_time: t.dueHasTime ?? false,
    priority: t.priority ?? "none",
    status: "open",
    completed_at: null,
    flagged: false,
    recurrence_rule: t.recurrenceRule ?? null,
    series_id: null,
    sort_order: Date.now(),
  })
}

/**
 * Tick a task. A recurring task also creates its next occurrence, with an id derived from the
 * series and the next due date, so two devices ticking the same task create it once
 * (docs/sync.md "Recurring task completed on two devices").
 */
export async function completeTask(store: Store, task: Stored<"tasks">, timeZone: string): Promise<void> {
  await store.update("tasks", task.id, { status: "done", completed_at: new Date().toISOString() })
  if (!task.recurrence_rule || !task.due_at) return
  const next = nextOccurrence(task.recurrence_rule, task.due_at, timeZone)
  if (!next) return
  const seriesId = task.series_id ?? task.id
  const nextId = ids.nextRecurringTask(seriesId, next)
  if (await store.db.tasks.get(nextId)) return
  await store.create(
    "tasks",
    {
      list_id: task.list_id ?? null,
      parent_id: task.parent_id ?? null,
      note_id: task.note_id ?? null,
      title: task.title,
      notes: task.notes ?? null,
      due_at: next,
      due_has_time: task.due_has_time,
      priority: task.priority,
      status: "open",
      completed_at: null,
      flagged: task.flagged,
      recurrence_rule: task.recurrence_rule,
      series_id: seriesId,
      sort_order: task.sort_order,
    },
    nextId,
  )
}

export async function reopenTask(store: Store, task: Stored<"tasks">): Promise<void> {
  await store.update("tasks", task.id, { status: "open", completed_at: null })
}

export async function addList(store: Store, name: string): Promise<string> {
  return store.create("lists", { name: name.trim(), colour: null, sort_order: Date.now(), is_inbox: false })
}

export async function addNote(store: Store, folderId: string | null = null): Promise<string> {
  return store.create("notes", {
    folder_id: folderId,
    title: "",
    plain_text: "",
    colour: null,
    pinned: false,
    favourite: false,
    locked: false,
    last_opened_at: new Date().toISOString(),
  })
}

export type ReminderTarget = { type: "task" | "note"; id: string; title: string }

export async function setReminder(
  store: Store,
  target: ReminderTarget,
  fireAt: string,
  timeZone: string,
  recurrenceRule: string | null = null,
): Promise<string> {
  // One active reminder per item: cancel the old one first.
  const existing = await store.db.reminders.where("target_id").equals(target.id).toArray()
  for (const r of existing) if (r.status === "scheduled" && !r.deleted_at) await store.update("reminders", r.id, { status: "cancelled" })
  return store.create("reminders", {
    target_type: target.type,
    target_id: target.id,
    title: target.title || "Reminder",
    fire_at: new Date(fireAt).toISOString(),
    timezone: timeZone,
    recurrence_rule: recurrenceRule,
    status: "scheduled",
  })
}

export async function cancelReminder(store: Store, reminderId: string): Promise<void> {
  await store.update("reminders", reminderId, { status: "cancelled" })
}

export type AckAction = "done" | "snoozed" | "dismissed"

/**
 * Acknowledge one occurrence from any device. Done on a task reminder also ticks the task;
 * snooze creates a one-off reminder at the snooze time (docs/reminders.md).
 */
export async function acknowledgeOccurrence(
  store: Store,
  reminder: Stored<"reminders">,
  fireAt: string,
  action: AckAction,
  opts: { snoozeUntil?: string; timeZone: string },
): Promise<void> {
  const occurrenceId = ids.reminderOccurrence(reminder.id, fireAt)
  const now = new Date().toISOString()
  const existing = await store.db.reminder_occurrences.get(occurrenceId)
  if (existing?.acknowledged_at) return
  if (existing) {
    await store.update("reminder_occurrences", occurrenceId, {
      acknowledged_at: now,
      acknowledged_action: action,
      acknowledged_device_id: store.deviceId,
    })
  } else {
    await store.create(
      "reminder_occurrences",
      {
        reminder_id: reminder.id,
        fire_at: new Date(fireAt).toISOString(),
        acknowledged_at: now,
        acknowledged_action: action,
        acknowledged_device_id: store.deviceId,
      },
      occurrenceId,
    )
  }
  const notificationId = ids.reminderNotification(occurrenceId)
  if (await store.db.notifications.get(notificationId)) await store.update("notifications", notificationId, { read_at: now })

  if (!reminder.recurrence_rule && action !== "snoozed") await store.update("reminders", reminder.id, { status: "done" })
  if (action === "done" && reminder.target_type === "task") {
    const task = await store.db.tasks.get(reminder.target_id)
    if (task && task.status === "open") await completeTask(store, task, opts.timeZone)
  }
  if (action === "snoozed" && opts.snoozeUntil) {
    if (!reminder.recurrence_rule) await store.update("reminders", reminder.id, { status: "done" })
    await store.create("reminders", {
      target_type: reminder.target_type,
      target_id: reminder.target_id,
      title: reminder.title,
      fire_at: new Date(opts.snoozeUntil).toISOString(),
      timezone: reminder.timezone,
      recurrence_rule: null,
      status: "scheduled",
    })
  }
}

export async function markNotificationRead(store: Store, id: string): Promise<void> {
  await store.update("notifications", id, { read_at: new Date().toISOString() })
}

export async function markAllNotificationsRead(store: Store): Promise<void> {
  const unread = await store.db.notifications.filter((n) => !n.read_at && !n.deleted_at).toArray()
  for (const n of unread) await markNotificationRead(store, n.id)
}

export { newId }
