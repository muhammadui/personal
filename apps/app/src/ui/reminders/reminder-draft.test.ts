import { describe, expect, it } from "vitest"
import {
  alertSummary,
  alertsShort,
  draftAlertsBefore,
  draftProblem,
  draftToInput,
  minutesLabel,
  newDraft,
  type ReminderDraft,
} from "./reminder-draft"

const LAGOS = "Africa/Lagos"
// 4:00 pm in Lagos (UTC+1).
const FOUR_PM = "2026-11-09T15:00:00.000Z"

const draft = (over: Partial<ReminderDraft> = {}): ReminderDraft => ({
  title: "Call the bank",
  body: "",
  date: "2026-11-09",
  time: "16:00",
  before: [],
  custom: null,
  nag: false,
  nagEvery: 5,
  nagCount: 3,
  rule: null,
  ...over,
})

describe("alertSummary", () => {
  it("lists early alerts and repeats", () => {
    expect(alertSummary(FOUR_PM, [5, 10], 5, 3, LAGOS)).toBe(
      "Alerts at 3:50, 3:55 and 4:00 pm, then every 5 min up to 3 times until Done.",
    )
  })
  it("says a single alert plainly", () => {
    expect(alertSummary(FOUR_PM, [], null, null, LAGOS)).toBe("Alert at 4:00 pm.")
  })
  it("keeps am and pm when they differ", () => {
    expect(alertSummary("2026-11-09T11:00:00.000Z", [60], null, null, LAGOS)).toBe(
      "Alerts at 11:00 am and 12:00 pm.",
    )
  })
  it("words one repeat", () => {
    expect(alertSummary(FOUR_PM, [], 10, 1, LAGOS)).toBe(
      "Alert at 4:00 pm, then once more after 10 min unless you tap Done.",
    )
  })
})

describe("draft helpers", () => {
  it("starts at the next full hour in the user's zone", () => {
    const d = newDraft(new Date("2026-11-09T14:20:30.000Z"), LAGOS)
    expect(d.date).toBe("2026-11-09")
    expect(d.time).toBe("16:00")
  })
  it("rolls over midnight", () => {
    const d = newDraft(new Date("2026-11-09T23:10:00.000Z"), LAGOS)
    expect(d.date).toBe("2026-11-10")
    expect(d.time).toBe("01:00")
  })
  it("merges the custom alert with presets", () => {
    expect(draftAlertsBefore(draft({ before: [5, 30], custom: "45" }))).toEqual([45, 30, 5])
    expect(draftAlertsBefore(draft({ before: [5], custom: "abc" }))).toEqual([5])
  })
  it("reports what is missing", () => {
    const now = new Date("2026-11-09T12:00:00.000Z")
    expect(draftProblem(draft({ title: " " }), now, LAGOS)).toBe("Add what to remind you about.")
    expect(draftProblem(draft({ time: "" }), now, LAGOS)).toBe("Pick a day and a time.")
    expect(draftProblem(draft({ time: "12:00" }), now, LAGOS)).toBe("Pick a time later than now.")
    expect(draftProblem(draft({ custom: "0" }), now, LAGOS)).toBe(
      "Custom alert: 1 to 10080 minutes.",
    )
    expect(draftProblem(draft(), now, LAGOS)).toBeNull()
  })
  it("builds the action input", () => {
    expect(draftToInput(draft({ body: "  ", before: [10], nag: true }), LAGOS)).toEqual({
      title: "Call the bank",
      body: null,
      fireAt: FOUR_PM,
      timeZone: LAGOS,
      recurrenceRule: null,
      alertsBefore: [10],
      nagEveryMin: 5,
      nagCount: 3,
    })
  })
  it("labels minutes and rows", () => {
    expect(minutesLabel(90)).toBe("90 min")
    expect(minutesLabel(120)).toBe("2 hours")
    expect(minutesLabel(1440)).toBe("1 day")
    expect(alertsShort([10], null, null)).toBe("Alert 10 min before")
    expect(alertsShort([10, 5], 5, 3)).toBe("2 early alerts · Again every 5 min until Done")
    expect(alertsShort(null, null, null)).toBe("")
  })
})
