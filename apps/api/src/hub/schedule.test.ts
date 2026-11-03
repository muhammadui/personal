import { ids, newId } from "@personal/core"
import { describe, expect, it } from "vitest"
import { collectDue, formatTime, initialNextAt, MISSED_AFTER_MS, nextAlarmAt, type HubReminder } from "./schedule"

const now = Date.parse("2026-11-03T10:00:00.000Z")
const base = (over: Partial<HubReminder> = {}): HubReminder => ({
  id: newId(),
  title: "Pay bill",
  fireAt: "2026-11-03T15:00:00.000Z",
  timezone: "Africa/Lagos",
  rule: null,
  active: true,
  targetType: "task",
  targetId: newId(),
  nextAt: "2026-11-03T15:00:00.000Z",
  ...over,
})

describe("reminder schedule (UserHub)", () => {
  it("sets the alarm at the earliest active reminder", () => {
    const a = base({ nextAt: "2026-11-03T15:00:00.000Z" })
    const b = base({ nextAt: "2026-11-03T12:00:00.000Z" })
    const off = base({ nextAt: "2026-11-03T11:00:00.000Z", active: false })
    expect(nextAlarmAt([a, b, off])).toBe(Date.parse("2026-11-03T12:00:00.000Z"))
    expect(nextAlarmAt([])).toBeNull()
  })

  it("sends a due one-off reminder once, with the deterministic occurrence id, then finishes", () => {
    const r = base({ nextAt: "2026-11-03T09:59:00.000Z" })
    const { due, updated } = collectDue([r], new Set(), new Set(), now)
    expect(due.map((d) => d.occurrenceId)).toEqual([ids.reminderOccurrence(r.id, "2026-11-03T09:59:00.000Z")])
    expect(updated[0]?.nextAt).toBeNull()
  })

  it("skips occurrences acknowledged on another device, already sent, or older than 24 h", () => {
    const acked = base({ nextAt: "2026-11-03T09:00:00.000Z" })
    const sent = base({ nextAt: "2026-11-03T09:30:00.000Z" })
    const stale = base({ nextAt: new Date(now - MISSED_AFTER_MS - 1000).toISOString() })
    const ackSet = new Set([ids.reminderOccurrence(acked.id, acked.nextAt!)])
    const sentSet = new Set([ids.reminderOccurrence(sent.id, sent.nextAt!)])
    expect(collectDue([acked, sent, stale], ackSet, sentSet, now).due).toEqual([])
  })

  it("advances a daily reminder to the next day at the same local time", () => {
    const r = base({ rule: "FREQ=DAILY", fireAt: "2026-11-03T08:00:00.000Z", nextAt: "2026-11-03T08:00:00.000Z" })
    const { due, updated } = collectDue([r], new Set(), new Set(), now)
    expect(due).toHaveLength(1)
    expect(updated[0]?.nextAt).toBe("2026-11-04T08:00:00.000Z")
  })

  it("a new recurring reminder whose first time is long past starts from the next occurrence", () => {
    const r = base({ rule: "FREQ=DAILY", fireAt: "2026-10-01T08:00:00.000Z" })
    expect(initialNextAt(r, now)).toBe("2026-11-04T08:00:00.000Z")
    expect(initialNextAt(base({ active: false }), now)).toBeNull()
  })

  it("formats the time in the reminder's timezone", () => {
    expect(formatTime("2026-11-03T15:00:00.000Z", "Africa/Lagos")).toBe("4:00 pm")
  })
})
