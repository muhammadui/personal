import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { describeRule, formatRule, nextOccurrence, parseRule } from "./recurrence"
import { utcToZoned, zonedToUtc } from "./zoned-time"

describe("parseRule / formatRule", () => {
  it.each([
    "FREQ=DAILY",
    "FREQ=DAILY;INTERVAL=2",
    "FREQ=WEEKLY;BYDAY=MO,WE",
    "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,SU",
    "FREQ=MONTHLY",
    "FREQ=YEARLY;INTERVAL=3",
  ])("round-trips %s", (rule) => {
    const p = parseRule(rule)
    expect(p.ok).toBe(true)
    if (p.ok) expect(formatRule(p.value)).toBe(rule)
  })

  it("normalises INTERVAL=1, case and day order", () => {
    const p = parseRule("rrule:freq=weekly;interval=1;byday=fr,mo")
    expect(p.ok && formatRule(p.value)).toBe("FREQ=WEEKLY;BYDAY=MO,FR")
  })

  it.each([
    "", "FREQ=HOURLY", "INTERVAL=2", "FREQ=DAILY;INTERVAL=0", "FREQ=DAILY;INTERVAL=x",
    "FREQ=DAILY;BYDAY=MO", "FREQ=WEEKLY;BYDAY=XX", "FREQ=DAILY;COUNT=3", "FREQ=DAILY;FREQ=WEEKLY", "garbage",
  ])("rejects %j", (rule) => {
    const p = parseRule(rule)
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.error).toBe("invalid_rule")
  })
})

describe("describeRule", () => {
  it.each([
    ["FREQ=DAILY", "Every day"],
    ["FREQ=DAILY;INTERVAL=2", "Every 2 days"],
    ["FREQ=WEEKLY;BYDAY=MO,WE", "Every week on Mon, Wed"],
    ["FREQ=WEEKLY", "Every week"],
    ["FREQ=MONTHLY", "Every month"],
    ["FREQ=YEARLY", "Every year"],
    ["nope", "Invalid repeat"],
  ])("%s -> %s", (rule, text) => expect(describeRule(rule)).toBe(text))
})

describe("nextOccurrence", () => {
  const L = "Africa/Lagos"
  it("daily in Lagos", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-11-03T08:00:00.000Z", L)).toBe("2026-11-04T08:00:00.000Z")
    expect(nextOccurrence("FREQ=DAILY;INTERVAL=3", "2026-11-03T08:00:00.000Z", L)).toBe("2026-11-06T08:00:00.000Z")
  })

  it("keeps 09:00 Europe/London across spring forward and fall back", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-03-28T09:00:00.000Z", "Europe/London")).toBe("2026-03-29T08:00:00.000Z")
    expect(nextOccurrence("FREQ=DAILY", "2026-10-24T08:00:00.000Z", "Europe/London")).toBe("2026-10-25T09:00:00.000Z")
  })

  it("weekly without BYDAY", () => {
    expect(nextOccurrence("FREQ=WEEKLY;INTERVAL=2", "2026-11-03T08:00:00.000Z", L)).toBe("2026-11-17T08:00:00.000Z")
  })

  it("weekly with BYDAY", () => {
    // 2026-11-03 is a Tuesday.
    const r = "FREQ=WEEKLY;BYDAY=MO,WE"
    expect(nextOccurrence(r, "2026-11-03T08:00:00.000Z", L)).toBe("2026-11-04T08:00:00.000Z")
    expect(nextOccurrence(r, "2026-11-04T08:00:00.000Z", L)).toBe("2026-11-09T08:00:00.000Z")
    expect(nextOccurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE", "2026-11-04T08:00:00.000Z", L)).toBe("2026-11-16T08:00:00.000Z")
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=SU", "2026-11-03T08:00:00.000Z", L)).toBe("2026-11-08T08:00:00.000Z")
  })

  it("uses the local date, not the UTC date", () => {
    // 23:30 UTC Tuesday is 05:00 Wednesday in Kolkata.
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=WE,TH", "2026-11-03T23:30:00.000Z", "Asia/Kolkata")).toBe("2026-11-04T23:30:00.000Z")
  })

  it("monthly on the 31st clamps to month length", () => {
    expect(nextOccurrence("FREQ=MONTHLY", "2026-01-31T08:00:00.000Z", L)).toBe("2026-02-28T08:00:00.000Z")
    expect(nextOccurrence("FREQ=MONTHLY", "2026-03-31T08:00:00.000Z", L)).toBe("2026-04-30T08:00:00.000Z")
    expect(nextOccurrence("FREQ=MONTHLY;INTERVAL=2", "2026-12-31T08:00:00.000Z", L)).toBe("2027-02-28T08:00:00.000Z")
  })

  it("monthly keeps local time across New York DST", () => {
    expect(nextOccurrence("FREQ=MONTHLY", "2026-02-15T14:00:00.000Z", "America/New_York")).toBe("2026-03-15T13:00:00.000Z")
  })

  it("yearly, including 29 Feb", () => {
    expect(nextOccurrence("FREQ=YEARLY", "2026-11-03T08:00:00.000Z", L)).toBe("2027-11-03T08:00:00.000Z")
    expect(nextOccurrence("FREQ=YEARLY", "2028-02-29T08:00:00.000Z", L)).toBe("2029-02-28T08:00:00.000Z")
  })

  it("returns null for invalid input", () => {
    expect(nextOccurrence("FREQ=HOURLY", "2026-11-03T08:00:00.000Z", L)).toBeNull()
    expect(nextOccurrence("FREQ=DAILY", "not a date", L)).toBeNull()
  })

  it("property: strictly increasing over 50 steps; DAILY/WEEKLY keep local hh:mm", () => {
    const zones = ["Africa/Lagos", "Europe/London", "America/New_York", "Asia/Kolkata"]
    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
    const ruleArb = fc.oneof(
      fc.record({ f: fc.constantFrom("DAILY", "MONTHLY", "YEARLY"), i: fc.integer({ min: 1, max: 4 }) })
        .map(({ f, i }) => `FREQ=${f};INTERVAL=${i}`),
      fc.record({ i: fc.integer({ min: 1, max: 3 }), d: fc.subarray(days) })
        .map(({ i, d }) => `FREQ=WEEKLY;INTERVAL=${i}${d.length ? `;BYDAY=${d.join(",")}` : ""}`),
    )
    fc.assert(
      fc.property(
        ruleArb,
        fc.constantFrom(...zones),
        fc.record({
          year: fc.integer({ min: 2020, max: 2035 }), month: fc.integer({ min: 1, max: 12 }),
          day: fc.integer({ min: 1, max: 28 }),
          // Hours 04-22 avoid DST gaps, where a wall time legitimately shifts.
          hour: fc.integer({ min: 4, max: 22 }), minute: fc.integer({ min: 0, max: 59 }),
        }),
        (rule, tz, local) => {
          let prev = zonedToUtc(local, tz).toISOString()
          for (let n = 0; n < 50; n++) {
            const next = nextOccurrence(rule, prev, tz)
            expect(next).not.toBeNull()
            expect(Date.parse(next as string)).toBeGreaterThan(Date.parse(prev))
            if (/DAILY|WEEKLY/.test(rule)) {
              const z = utcToZoned(new Date(next as string), tz)
              expect([z.hour, z.minute]).toEqual([local.hour, local.minute])
            }
            prev = next as string
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
