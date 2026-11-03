import type { HlcState, Mutation, SyncedTable, TableData } from "@personal/core"
import Dexie, { type Table } from "dexie"

/** A synced record as stored on the device: its data, its id, and the per-field HLC map. */
export type Stored<T extends SyncedTable> = TableData[T] & { id: string; _hlc: Record<string, string> }

export type OutboxEntry = {
  seq?: number
  mutation: Mutation
  created_at: number
  attempts: number
  last_error?: string
}

export type LocalDocUpdate = { id: string; note_id: string; update: Uint8Array; synced: 0 | 1; created_at: number }
export type DocOutboxEntry = { seq?: number; id: string; note_id: string; update: Uint8Array; compacts_up_to?: number }
export type SyncStateRow = { key: "cursor" | "hlc" | "device_id" | "last_sync_at"; value: unknown }
export type { HlcState }

/**
 * One IndexedDB database per signed-in user (docs/sync.md): `personal-<userId>`.
 * Typed record tables mirror docs/data-model.md; the rest are device-only.
 */
export class PersonalDb extends Dexie {
  settings!: Table<Stored<"settings">, string>
  folders!: Table<Stored<"folders">, string>
  notes!: Table<Stored<"notes">, string>
  note_versions!: Table<Stored<"note_versions">, string>
  lists!: Table<Stored<"lists">, string>
  tasks!: Table<Stored<"tasks">, string>
  tags!: Table<Stored<"tags">, string>
  note_tags!: Table<Stored<"note_tags">, string>
  task_tags!: Table<Stored<"task_tags">, string>
  attachments!: Table<Stored<"attachments">, string>
  reminders!: Table<Stored<"reminders">, string>
  reminder_occurrences!: Table<Stored<"reminder_occurrences">, string>
  notifications!: Table<Stored<"notifications">, string>
  outbox!: Table<OutboxEntry, number>
  doc_updates!: Table<LocalDocUpdate, string>
  doc_outbox!: Table<DocOutboxEntry, number>
  sync_state!: Table<SyncStateRow, string>

  constructor(public readonly userId: string) {
    super(`personal-${userId}`)
    this.version(1).stores({
      settings: "id",
      folders: "id, parent_id",
      notes: "id, folder_id, updated_at",
      note_versions: "id, note_id",
      lists: "id, sort_order",
      tasks: "id, list_id, due_at, status, parent_id, series_id",
      tags: "id, name",
      note_tags: "id, tag_id, note_id",
      task_tags: "id, tag_id, task_id",
      attachments: "id, note_id",
      reminders: "id, target_id, fire_at",
      reminder_occurrences: "id, reminder_id",
      notifications: "id, created_at",
      outbox: "++seq",
      doc_updates: "id, note_id, synced",
      doc_outbox: "++seq, id, note_id",
      sync_state: "key",
    })
  }

  recordTable<T extends SyncedTable>(table: T): Table<Stored<T>, string> {
    return this.table(table) as unknown as Table<Stored<T>, string>
  }
}

/** Delete every local trace of an account (sign-out). */
export async function deleteLocalData(userId: string): Promise<void> {
  await Dexie.delete(`personal-${userId}`)
}
