import { describe, expect, it } from "vitest"
import { SYNCED_TABLES, validateFields, validateRecord, type SyncedTable } from "./schemas"
import { checkMutation } from "./protocol"
import { ids, newId } from "./ids"

const now = "2026-11-03T10:00:00.000Z"
const base = { created_at: now, updated_at: now }
const u = () => newId()

const valid: Record<SyncedTable, Record<string, unknown>> = {
  settings: { ...base, theme: "system", timezone: "Africa/Lagos", default_reminder_time: "09:00", week_start: 1 },
  folders: { ...base, name: "Work", sort_order: 1, parent_id: null },
  notes: { ...base, title: "Hello", pinned: false, favourite: false, locked: false, plain_text: "hi" },
  note_versions: { ...base, note_id: u(), snapshot: "AAAA", reason: "hourly" },
  lists: { ...base, name: "Inbox", sort_order: 0, is_inbox: true },
  tasks: { ...base, title: "Pay bill", due_at: now, due_has_time: true, priority: "high", status: "open", flagged: false, sort_order: 1 },
  tags: { ...base, name: "home" },
  note_tags: { ...base, tag_id: u(), note_id: u() },
  task_tags: { ...base, tag_id: u(), task_id: u() },
  attachments: { ...base, note_id: u(), kind: "image", mime: "image/png", size_bytes: 10, content_hash: "abc", upload_state: "local" },
  reminders: { ...base, target_type: "task", target_id: u(), title: "Pay bill", fire_at: now, timezone: "Africa/Lagos", status: "scheduled" },
  reminder_occurrences: { ...base, reminder_id: u(), fire_at: now },
  notifications: { ...base, kind: "reminder", title: "Pay bill" },
}

const invalid: Record<SyncedTable, Record<string, unknown>> = {
  settings: { ...valid.settings, theme: "neon" },
  folders: { ...valid.folders, name: "" },
  notes: { ...valid.notes, pinned: "yes" },
  note_versions: { ...valid.note_versions, reason: "random" },
  lists: { ...valid.lists, sort_order: Number.POSITIVE_INFINITY },
  tasks: { ...valid.tasks, priority: "urgent" },
  tags: { ...valid.tags, name: 5 },
  note_tags: { ...valid.note_tags, tag_id: "not-a-uuid" },
  task_tags: { ...valid.task_tags, task_id: "x" },
  attachments: { ...valid.attachments, size_bytes: -1 },
  reminders: { ...valid.reminders, fire_at: "tomorrow" },
  reminder_occurrences: { ...valid.reminder_occurrences, acknowledged_action: "ignored" },
  notifications: { ...valid.notifications, kind: "spam" },
}

describe("table schemas", () => {
  for (const table of SYNCED_TABLES) {
    it(`${table}: accepts a valid record and rejects an invalid one`, () => {
      expect(validateRecord(table, valid[table]).success).toBe(true)
      expect(validateRecord(table, invalid[table]).success).toBe(false)
    })
    it(`${table}: rejects unknown fields`, () => {
      expect(validateFields(table, { surprise: 1 }).success).toBe(false)
    })
  }

  it("a partial field set is valid for a mutation but not as a full record", () => {
    expect(validateFields("tasks", { title: "x" }).success).toBe(true)
    expect(validateRecord("tasks", { title: "x" }).success).toBe(false)
  })
})

describe("checkMutation", () => {
  const m = (over: Record<string, unknown> = {}) => ({
    id: u(),
    table: "tasks",
    recordId: u(),
    op: "upsert",
    fields: { title: "x" },
    hlc: "000001793667275-00003-dev1",
    ...over,
  })

  it("accepts a valid upsert and a valid delete", () => {
    expect(checkMutation(m()).ok).toBe(true)
    expect(checkMutation(m({ op: "delete", fields: { deleted_at: now } })).ok).toBe(true)
  })

  it("rejects bad envelopes, bad fields and server-owned fields", () => {
    expect(checkMutation(m({ table: "users" }))).toMatchObject({ ok: false, code: "invalid" })
    expect(checkMutation(m({ hlc: "yesterday" }))).toMatchObject({ ok: false, code: "invalid" })
    expect(checkMutation(m({ fields: { priority: "urgent" } }))).toMatchObject({ ok: false, code: "invalid" })
    expect(checkMutation(m({ fields: { user_id: "someone" } }))).toMatchObject({ ok: false, code: "invalid" })
    expect(checkMutation(m({ op: "delete", fields: { title: "x" } }))).toMatchObject({ ok: false, code: "invalid" })
    expect(checkMutation("nope")).toMatchObject({ ok: false, id: "unknown" })
  })
})

describe("deterministic ids", () => {
  it("are stable and independent of ISO spelling", () => {
    const r = u()
    expect(ids.reminderOccurrence(r, "2026-11-03T10:00:00Z")).toBe(ids.reminderOccurrence(r, "2026-11-03T11:00:00.000+01:00"))
    expect(ids.inbox("user-1")).toBe(ids.inbox("user-1"))
    expect(ids.inbox("user-1")).not.toBe(ids.inbox("user-2"))
    expect(ids.settings("abc")).toBe("abc")
  })
})
