import { describe, expect, it } from "vitest"
import { parseQuickAdd } from "./quick-add"

// Tuesday 3 Nov 2026, 10:00 in Lagos (UTC+1).
const NOW = new Date("2026-11-03T09:00:00.000Z")
const TZ = "Africa/Lagos"

type Row = [input: string, title: string, dueAt: string | null, hasTime: boolean]

const rows: Row[] = [
  ["pay electricity bill tomorrow 6pm", "pay electricity bill", "2026-11-04T17:00:00.000Z", true],
  ["call mum today", "call mum", "2026-11-02T23:00:00.000Z", false],
  ["call mum today at 3pm", "call mum", "2026-11-03T14:00:00.000Z", true],
  ["read tonight", "read", "2026-11-03T19:00:00.000Z", true],
  ["read tonight at 9pm", "read", "2026-11-03T20:00:00.000Z", true],
  ["gym tomorrow", "gym", "2026-11-03T23:00:00.000Z", false],
  ["Gym TOMORROW 6:30PM", "Gym", "2026-11-04T17:30:00.000Z", true],
  ["team sync monday", "team sync", "2026-11-08T23:00:00.000Z", false],
  ["team sync on mon 9am", "team sync", "2026-11-09T08:00:00.000Z", true],
  ["review tuesday", "review", "2026-11-09T23:00:00.000Z", false],
  ["plan next monday", "plan", "2026-11-08T23:00:00.000Z", false],
  ["plan next friday", "plan", "2026-11-12T23:00:00.000Z", false],
  ["friday 18:00 drinks", "drinks", "2026-11-06T17:00:00.000Z", true],
  ["check oven in 30 minutes", "check oven", "2026-11-03T09:30:00.000Z", true],
  ["stretch in 2 hours", "stretch", "2026-11-03T11:00:00.000Z", true],
  ["renew licence in 3 days", "renew licence", "2026-11-05T23:00:00.000Z", false],
  ["dentist in 2 weeks", "dentist", "2026-11-16T23:00:00.000Z", false],
  ["lunch at noon", "lunch", "2026-11-03T11:00:00.000Z", true],
  ["backup at midnight", "backup", "2026-11-03T23:00:00.000Z", true],
  ["standup 9am", "standup", "2026-11-04T08:00:00.000Z", true],
  ["call bank 6pm", "call bank", "2026-11-03T17:00:00.000Z", true],
  ["call bank at 6", "call bank", "2026-11-03T17:00:00.000Z", true],
  ["call bank 10:00", "call bank", "2026-11-04T09:00:00.000Z", true],
  ["birthday 3 nov", "birthday", "2026-11-02T23:00:00.000Z", false],
  ["birthday nov 20", "birthday", "2026-11-19T23:00:00.000Z", false],
  ["rent 1/12", "rent", "2026-11-30T23:00:00.000Z", false],
  ["tax return 15 mar 10am", "tax return", "2027-03-15T09:00:00.000Z", true],
  ["new year 1 jan", "new year", "2026-12-31T23:00:00.000Z", false],
  ["buy milk", "buy milk", null, false],
  ["  monday-ish money   ", "monday-ish money", null, false],
  ["read 31/2", "read 31/2", null, false],
]

describe("parseQuickAdd", () => {
  it.each(rows)("%j", (input, title, dueAt, dueHasTime) => {
    expect(parseQuickAdd(input, NOW, TZ)).toEqual({ title, dueAt, dueHasTime })
  })

  it("uses the given timezone", () => {
    expect(parseQuickAdd("call tomorrow 9am", NOW, "Asia/Kolkata").dueAt).toBe("2026-11-04T03:30:00.000Z")
  })
})
