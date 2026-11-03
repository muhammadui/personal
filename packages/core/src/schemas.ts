import { z } from "zod"

/**
 * Zod schemas for every synced table (docs/data-model.md).
 * A record's `data` never contains `id`, `_hlc` or server fields.
 */

const iso = z.iso.datetime({ offset: true })
const isoNullable = iso.nullable()
const uuid = z.uuid()
const uuidNullable = uuid.nullable()
const shortText = (max: number) => z.string().max(max)
const colour = z.string().max(32).nullable()
const sortOrder = z.number().finite()

const base = {
  created_at: iso,
  updated_at: iso,
  deleted_at: isoNullable.optional(),
}

const opt = <T extends z.ZodType>(t: T) => t.nullable().optional()

export const settingsSchema = z.strictObject({
  ...base,
  theme: z.enum(["system", "light", "dark"]),
  timezone: shortText(64),
  default_reminder_time: z.string().regex(/^\d{2}:\d{2}$/),
  week_start: z.number().int().min(0).max(6),
  quiet_hours_start: opt(z.string().regex(/^\d{2}:\d{2}$/)),
  quiet_hours_end: opt(z.string().regex(/^\d{2}:\d{2}$/)),
})

export const folderSchema = z.strictObject({
  ...base,
  parent_id: opt(uuid),
  name: shortText(200).min(1),
  colour: opt(colour),
  sort_order: sortOrder,
})

export const noteSchema = z.strictObject({
  ...base,
  folder_id: opt(uuid),
  title: shortText(500),
  plain_text: opt(shortText(200_000)),
  colour: opt(colour),
  pinned: z.boolean(),
  favourite: z.boolean(),
  locked: z.boolean(),
  last_opened_at: opt(iso),
})

export const noteVersionSchema = z.strictObject({
  ...base,
  note_id: uuid,
  snapshot: z.string().max(5_000_000),
  reason: z.enum(["hourly", "restore", "manual"]),
})

export const listSchema = z.strictObject({
  ...base,
  name: shortText(200).min(1),
  colour: opt(colour),
  sort_order: sortOrder,
  is_inbox: z.boolean(),
})

export const taskPriority = z.enum(["none", "low", "medium", "high"])
export const taskStatus = z.enum(["open", "done"])

export const taskSchema = z.strictObject({
  ...base,
  list_id: opt(uuid),
  parent_id: opt(uuid),
  note_id: opt(uuid),
  title: shortText(1000),
  notes: opt(shortText(20_000)),
  due_at: opt(iso),
  due_has_time: z.boolean(),
  priority: taskPriority,
  status: taskStatus,
  completed_at: opt(iso),
  flagged: z.boolean(),
  recurrence_rule: opt(shortText(200)),
  series_id: opt(uuid),
  sort_order: sortOrder,
})

export const tagSchema = z.strictObject({
  ...base,
  name: shortText(100).min(1),
  colour: opt(colour),
})

export const noteTagSchema = z.strictObject({ ...base, tag_id: uuid, note_id: uuid })
export const taskTagSchema = z.strictObject({ ...base, tag_id: uuid, task_id: uuid })

export const attachmentSchema = z.strictObject({
  ...base,
  note_id: uuid,
  kind: z.enum(["image", "audio", "pdf"]),
  mime: shortText(100),
  size_bytes: z.number().int().nonnegative(),
  content_hash: shortText(128),
  storage_key: opt(shortText(500)),
  upload_state: z.enum(["local", "uploading", "uploaded"]),
})

export const reminderSchema = z.strictObject({
  ...base,
  target_type: z.enum(["task", "note"]),
  target_id: uuid,
  title: shortText(500),
  fire_at: iso,
  timezone: shortText(64),
  recurrence_rule: opt(shortText(200)),
  status: z.enum(["scheduled", "done", "cancelled"]),
})

export const reminderOccurrenceSchema = z.strictObject({
  ...base,
  reminder_id: uuid,
  fire_at: iso,
  acknowledged_at: opt(iso),
  acknowledged_action: opt(z.enum(["done", "snoozed", "dismissed"])),
  acknowledged_device_id: opt(shortText(64)),
})

export const notificationSchema = z.strictObject({
  ...base,
  kind: z.enum(["reminder", "sync", "account"]),
  title: shortText(500),
  body: opt(shortText(2000)),
  link: opt(shortText(500)),
  read_at: opt(iso),
  occurrence_id: opt(uuid),
})

export const tableSchemas = {
  settings: settingsSchema,
  folders: folderSchema,
  notes: noteSchema,
  note_versions: noteVersionSchema,
  lists: listSchema,
  tasks: taskSchema,
  tags: tagSchema,
  note_tags: noteTagSchema,
  task_tags: taskTagSchema,
  attachments: attachmentSchema,
  reminders: reminderSchema,
  reminder_occurrences: reminderOccurrenceSchema,
  notifications: notificationSchema,
} as const

export type SyncedTable = keyof typeof tableSchemas
export const SYNCED_TABLES = Object.keys(tableSchemas) as SyncedTable[]
export const syncedTableSchema = z.enum(SYNCED_TABLES as [SyncedTable, ...SyncedTable[]])

export type TableData = { [K in SyncedTable]: z.infer<(typeof tableSchemas)[K]> }
export type Settings = TableData["settings"]
export type Folder = TableData["folders"]
export type Note = TableData["notes"]
export type NoteVersion = TableData["note_versions"]
export type List = TableData["lists"]
export type Task = TableData["tasks"]
export type Tag = TableData["tags"]
export type Reminder = TableData["reminders"]
export type ReminderOccurrence = TableData["reminder_occurrences"]
export type Notification = TableData["notifications"]

/** Validate a partial field set for one table (used for every mutation). */
export function validateFields(table: SyncedTable, fields: Record<string, unknown>) {
  return tableSchemas[table].partial().safeParse(fields)
}

/** Validate a complete record (used when a mutation would create a record). */
export function validateRecord(table: SyncedTable, data: Record<string, unknown>) {
  return tableSchemas[table].safeParse(data)
}
