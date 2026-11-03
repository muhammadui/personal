import { describe, expect, it } from "vitest"
import {
  dateLabel,
  dayDiff,
  dueLabel,
  clockLabel,
  longDateLabel,
  firstLine,
  fromInputValues,
  isOverdue,
  relativeTime,
  editedLabel,
  snippet,
  summariseUserAgent,
  timeLabel,
  toInputValues,
} from "./format"

const LAGOS = "Africa/Lagos" // UTC+1, no DST
const NY = "America/New_York"
// Tuesday 3 Nov 2026, 10:00 in Lagos.
const now = new Date("2026-11-03T09:00:00Z")

describe("dayDiff", () => {
  it("counts calendar days in the time zone, not 24-hour blocks", () => {
    expect(dayDiff(new Date("2026-11-03T22:30:00Z"), now, LAGOS)).toBe(0) // 23:30 Lagos
    expect(dayDiff(new Date("2026-11-03T23:30:00Z"), now, LAGOS)).toBe(1) // 00:30 next day
    expect(dayDiff(new Date("2026-11-02T22:59:00Z"), now, LAGOS)).toBe(-1)
  })
  it("uses the given zone", () => {
    // 02:00 UTC on 4 Nov is still 3 Nov in New York.
    expect(dayDiff(new Date("2026-11-04T02:00:00Z"), now, NY)).toBe(0)
  })
})

describe("dueLabel", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(dueLabel("2026-11-03T15:00:00Z", true, now, LAGOS)).toBe("Today, 4:00 pm")
    expect(dueLabel("2026-11-03T23:00:00Z", false, now, LAGOS)).toBe("Tomorrow")
    expect(dueLabel("2026-11-02T08:00:00Z", true, now, LAGOS)).toBe("Yesterday, 9:00 am")
  })
  it("uses a short date further out", () => {
    expect(dueLabel("2026-11-08T23:00:00Z", false, now, LAGOS)).toBe("Mon 9 Nov")
    expect(dueLabel("2026-11-09T08:30:00Z", true, now, LAGOS)).toBe("Mon 9 Nov, 9:30 am")
  })
  it("adds the year when it differs", () => {
    expect(dateLabel("2027-01-05T12:00:00Z", now, LAGOS)).toBe("Tue 5 Jan 2027")
  })
})

describe("clock and long dates", () => {
  it("uses a 12-hour clock", () => {
    expect(clockLabel(0, 5)).toBe("12:05 am")
    expect(clockLabel(12, 0)).toBe("12:00 pm")
    expect(clockLabel(18, 30)).toBe("6:30 pm")
  })
  it("writes the long date for page headers", () => {
    expect(longDateLabel(now, LAGOS)).toBe("Tuesday, 3 November")
  })
})

describe("isOverdue", () => {
  it("timed tasks are overdue once the time passes", () => {
    expect(isOverdue("2026-11-03T08:59:00Z", true, now, LAGOS)).toBe(true)
    expect(isOverdue("2026-11-03T09:01:00Z", true, now, LAGOS)).toBe(false)
  })
  it("date-only tasks are overdue only after their day", () => {
    expect(isOverdue("2026-11-02T23:00:00Z", false, now, LAGOS)).toBe(false) // today, midnight Lagos
    expect(isOverdue("2026-11-01T23:00:00Z", false, now, LAGOS)).toBe(true)
  })
})

describe("relativeTime", () => {
  it("describes recent times", () => {
    expect(relativeTime("2026-11-03T08:59:40Z", now, LAGOS)).toBe("Just now")
    expect(relativeTime("2026-11-03T08:55:00Z", now, LAGOS)).toBe("5 min ago")
    expect(relativeTime("2026-11-03T06:00:00Z", now, LAGOS)).toBe("3 h ago")
    expect(relativeTime("2026-11-02T12:00:00Z", now, LAGOS)).toBe("Yesterday")
    expect(relativeTime("2026-10-20T12:00:00Z", now, LAGOS)).toBe("Tue 20 Oct")
  })
})

describe("editedLabel", () => {
  it("reads naturally", () => {
    expect(editedLabel("2026-11-03T08:59:50Z", now, LAGOS)).toBe("Edited just now")
    expect(editedLabel("2026-11-03T08:00:00Z", now, LAGOS)).toBe("Edited 1 h ago")
    expect(editedLabel("2026-11-02T12:00:00Z", now, LAGOS)).toBe("Edited yesterday")
  })
})

describe("input values", () => {
  it("round-trips through the time zone", () => {
    const iso = "2026-11-09T15:30:00.000Z"
    expect(toInputValues(iso, LAGOS)).toEqual({ date: "2026-11-09", time: "16:30" })
    expect(fromInputValues("2026-11-09", "16:30", LAGOS)).toBe(iso)
    expect(timeLabel(iso, NY)).toBe("10:30 am")
  })
  it("treats an empty time as the start of the day", () => {
    expect(fromInputValues("2026-11-09", "", LAGOS)).toBe("2026-11-08T23:00:00.000Z")
  })
  it("rejects a bad date", () => {
    expect(fromInputValues("", "10:00", LAGOS)).toBeNull()
  })
})

describe("summariseUserAgent", () => {
  it("names the browser and system", () => {
    expect(
      summariseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on Mac")
    expect(
      summariseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone")
    expect(summariseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0")).toBe(
      "Firefox on Windows",
    )
    expect(summariseUserAgent(null)).toBe("Unknown device")
  })
})

describe("note text", () => {
  it("takes the first non-empty line as the title", () => {
    expect(firstLine("\n  Shopping list \nmilk\neggs")).toBe("Shopping list")
    expect(firstLine("")).toBe("")
  })
  it("builds a one-line snippet from the rest", () => {
    expect(snippet("Shopping list\nmilk\n\neggs")).toBe("milk eggs")
    expect(snippet("Only a title")).toBe("")
  })
})
