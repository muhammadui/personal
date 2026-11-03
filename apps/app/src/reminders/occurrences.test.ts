import { ids, newId } from "@personal/core"
import { describe, expect, it } from "vitest"
import type { Stored } from "../data/db"
import { latestMissedPerReminder, pendingOccurrences, upcomingAlerts } from "./occurrences"

const now = Date.parse("2026-11-03T10:00:00.000Z")
const reminder = (over: Partial<Stored<"reminders">> = {}): Stored<"reminders"> => ({
  id: newId(),
  _hlc: {},
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
  target_type: "task",
  target_id: newId(),
  title: "Pay bill",
  fire_at: "2026-11-03T15:00:00.000Z",
  timezone: "Africa/Lagos",
  recurrence_rule: null,
  status: "scheduled",
  ...over,
})

describe("pendingOccurrences", () => {
  it("returns a one-off reminder due later today with its deterministic id", () => {
    const r = reminder()
    const [o] = pendingOccurrences([r], new Set(), now)
    expect(o?.occurrenceId).toBe(ids.reminderOccurrence(r.id, r.fire_at))
  })

  it("skips acknowledged, cancelled, deleted and far-future reminders", () => {
    const acked = reminder()
    const set = new Set([ids.reminderOccurrence(acked.id, acked.fire_at)])
    const list = [
      acked,
      reminder({ status: "cancelled" }),
      reminder({ deleted_at: "2026-11-02T00:00:00.000Z" }),
      reminder({ fire_at: "2026-11-10T09:00:00.000Z" }),
    ]
    expect(pendingOccurrences(list, set, now)).toEqual([])
  })

  it("expands a daily reminder across the missed window and the next 24 hours", () => {
    const r = reminder({ fire_at: "2026-10-30T08:00:00.000Z", recurrence_rule: "FREQ=DAILY" })
    const occ = pendingOccurrences([r], new Set(), now)
    // 30 Oct .. 4 Nov at 09:00 Lagos = 08:00 UTC: 6 occurrences
    expect(occ.map((o) => o.fireAt.slice(0, 10))).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"])
    expect(latestMissedPerReminder(occ, now).map((o) => o.fireAt)).toEqual(["2026-11-03T08:00:00.000Z"])
  })
})

describe("upcomingAlerts (device timers)", () => {
  it("sets a timer for each early alert, the time and each repeat", () => {
    const r = reminder({ target_type: "standalone", fire_at: "2026-11-03T10:30:00.000Z", alerts_before: [10], nag_every_min: 5, nag_count: 2 })
    expect(upcomingAlerts([r], new Set(), now).map((a) => [a.offsetMin, a.at])).toEqual([
      [-10, "2026-11-03T10:20:00.000Z"],
      [0, "2026-11-03T10:30:00.000Z"],
      [5, "2026-11-03T10:35:00.000Z"],
      [10, "2026-11-03T10:40:00.000Z"],
    ])
  })

  it("keeps only the repeats still to come, and none once Done", () => {
    const r = reminder({ fire_at: "2026-11-03T09:58:00.000Z", nag_every_min: 5, nag_count: 3 })
    expect(upcomingAlerts([r], new Set(), now).map((a) => a.offsetMin)).toEqual([5, 10, 15])
    expect(upcomingAlerts([r], new Set([ids.reminderOccurrence(r.id, r.fire_at)]), now)).toEqual([])
  })
})
