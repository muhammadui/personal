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

  describe("early alerts and repeats until Done", () => {
    const at = "2026-11-03T16:00:00.000Z"
    const nag = () => base({ fireAt: at, nextAt: at, targetType: "standalone", alerts: { alerts_before: [10, 5], nag_every_min: 5, nag_count: 2 } })
    const run = (r: HubReminder, acked: Set<string>, sent: Set<string>, iso: string) => {
      const res = collectDue([r], acked, sent, Date.parse(iso))
      for (const d of res.due) sent.add(d.alertKey)
      return { offsets: res.due.map((d) => d.offsetMin), next: res.updated[0] ?? r }
    }

    it("alerts 10 and 5 minutes before, at the time, then twice more, each once", () => {
      let r = nag()
      const sent = new Set<string>()
      const acked = new Set<string>()
      expect(nextAlarmAt([r], acked, sent)).toBe(Date.parse("2026-11-03T15:50:00.000Z"))
      const steps: [string, number[]][] = [
        ["2026-11-03T15:49:00.000Z", []],
        ["2026-11-03T15:50:00.000Z", [-10]],
        ["2026-11-03T15:55:00.000Z", [-5]],
        ["2026-11-03T16:00:00.000Z", [0]],
        ["2026-11-03T16:05:00.000Z", [5]],
        ["2026-11-03T16:10:00.000Z", [10]],
        ["2026-11-03T16:15:00.000Z", []],
      ]
      for (const [when, expected] of steps) {
        const res = run(r, acked, sent, when)
        expect(res.offsets, when).toEqual(expected)
        r = res.next
      }
      expect(r.nextAt).toBeNull()
      expect(nextAlarmAt([r], acked, sent)).toBeNull()
    })

    it("Done on any device stops the remaining repeats", () => {
      let r = nag()
      const sent = new Set<string>()
      const acked = new Set<string>()
      r = run(r, acked, sent, "2026-11-03T16:00:00.000Z").next
      acked.add(ids.reminderOccurrence(r.id, at))
      expect(nextAlarmAt([r], acked, sent)).toBeNull()
      const res = run(r, acked, sent, "2026-11-03T16:05:00.000Z")
      expect(res.offsets).toEqual([])
      expect(res.next.nextAt).toBeNull()
    })

    it("a phone that wakes late gets the alerts it missed, not ones older than 24 h", () => {
      const r = nag()
      const res = run(r, new Set(), new Set(), "2026-11-03T16:07:00.000Z")
      expect(res.offsets).toEqual([-10, -5, 0, 5])
    })

    it("a recurring reminder done early moves on to the next day", () => {
      const r = base({ fireAt: at, nextAt: at, rule: "FREQ=DAILY", alerts: { alerts_before: [10] } })
      const acked = new Set([ids.reminderOccurrence(r.id, at)])
      expect(nextAlarmAt([r], acked, new Set())).toBe(Date.parse("2026-11-04T15:50:00.000Z"))
    })
  })
})
