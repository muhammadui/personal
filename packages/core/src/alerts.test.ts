import { describe, expect, it } from "vitest"
import { alertBody, alertOffsets, occurrenceAlerts } from "./alerts"
import { ids } from "./ids"
import { validateRecord } from "./schemas"

describe("reminder alerts", () => {
  it("a plain reminder alerts once, at the time, keyed by the occurrence id", () => {
    const at = "2026-11-03T16:00:00.000Z"
    expect(occurrenceAlerts("0193f0a0-0000-7000-8000-000000000001", at, {})).toEqual([
      { offsetMin: 0, at, key: ids.reminderOccurrence("0193f0a0-0000-7000-8000-000000000001", at) },
    ])
  })

  it("early alerts, the time, then repeats every N minutes", () => {
    expect(alertOffsets({ alerts_before: [5, 10, 10], nag_every_min: 5, nag_count: 3 })).toEqual([-10, -5, 0, 5, 10, 15])
    const alerts = occurrenceAlerts("0193f0a0-0000-7000-8000-000000000001", "2026-11-03T16:00:00.000Z", { alerts_before: [10], nag_every_min: 5, nag_count: 1 })
    expect(alerts.map((a) => a.at)).toEqual(["2026-11-03T15:50:00.000Z", "2026-11-03T16:00:00.000Z", "2026-11-03T16:05:00.000Z"])
    expect(new Set(alerts.map((a) => a.key)).size).toBe(3)
  })

  it("plain wording", () => {
    expect(alertBody(-10, "4:00 pm")).toBe("In 10 min · 4:00 pm")
    expect(alertBody(-60, "4:00 pm")).toBe("In 1 hour · 4:00 pm")
    expect(alertBody(0, "4:00 pm")).toBe("Reminder · 4:00 pm")
    expect(alertBody(5, "4:00 pm")).toBe("Reminder again · 4:00 pm")
  })
})

describe("standalone reminder records", () => {
  const now = "2026-11-03T10:00:00.000Z"
  const rec = {
    created_at: now,
    updated_at: now,
    target_type: "standalone",
    target_id: "0193f0a0-0000-7000-8000-000000000001",
    title: "Call the bank",
    body: "Ask about the card fee",
    fire_at: now,
    timezone: "Africa/Lagos",
    status: "scheduled",
    alerts_before: [10, 5],
    nag_every_min: 5,
    nag_count: 3,
  }
  it("accepts early alerts and repeats, and refuses out-of-range values", () => {
    expect(validateRecord("reminders", rec).success).toBe(true)
    expect(validateRecord("reminders", { ...rec, alerts_before: [0] }).success).toBe(false)
    expect(validateRecord("reminders", { ...rec, nag_count: 50 }).success).toBe(false)
    expect(validateRecord("reminders", { ...rec, alerts_before: [1, 2, 3, 4, 5, 6, 7] }).success).toBe(false)
  })
})
