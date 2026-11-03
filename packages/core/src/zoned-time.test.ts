import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { isValidTimeZone, utcToZoned, zonedToUtc } from "./zoned-time"

const iso = (local: Parameters<typeof zonedToUtc>[0], tz: string) => zonedToUtc(local, tz).toISOString()

describe("zoned-time", () => {
  it("Africa/Lagos is UTC+1 all year", () => {
    expect(iso({ year: 2026, month: 1, day: 15, hour: 9, minute: 0 }, "Africa/Lagos")).toBe("2026-01-15T08:00:00.000Z")
    expect(iso({ year: 2026, month: 7, day: 15, hour: 9, minute: 0 }, "Africa/Lagos")).toBe("2026-07-15T08:00:00.000Z")
    expect(utcToZoned(new Date("2026-11-03T23:30:00Z"), "Africa/Lagos")).toEqual({
      year: 2026, month: 11, day: 4, hour: 0, minute: 30, weekday: 3,
    })
  })

  it("Europe/London winter and summer", () => {
    expect(iso({ year: 2026, month: 1, day: 10, hour: 9, minute: 0 }, "Europe/London")).toBe("2026-01-10T09:00:00.000Z")
    expect(iso({ year: 2026, month: 6, day: 10, hour: 9, minute: 0 }, "Europe/London")).toBe("2026-06-10T08:00:00.000Z")
  })

  it("Europe/London spring-forward gap picks the later instant", () => {
    // 2026-03-29 01:00 GMT -> 02:00 BST; 01:30 does not exist.
    expect(iso({ year: 2026, month: 3, day: 29, hour: 1, minute: 30 }, "Europe/London")).toBe("2026-03-29T01:30:00.000Z")
    expect(utcToZoned(new Date("2026-03-29T01:30:00Z"), "Europe/London").hour).toBe(2)
    expect(iso({ year: 2026, month: 3, day: 29, hour: 2, minute: 0 }, "Europe/London")).toBe("2026-03-29T01:00:00.000Z")
  })

  it("Europe/London fall-back overlap picks the earlier instant", () => {
    // 2026-10-25 02:00 BST -> 01:00 GMT; 01:30 happens twice.
    expect(iso({ year: 2026, month: 10, day: 25, hour: 1, minute: 30 }, "Europe/London")).toBe("2026-10-25T00:30:00.000Z")
    expect(iso({ year: 2026, month: 10, day: 25, hour: 3, minute: 0 }, "Europe/London")).toBe("2026-10-25T03:00:00.000Z")
  })

  it("America/New_York across DST", () => {
    expect(iso({ year: 2026, month: 1, day: 5, hour: 9, minute: 0 }, "America/New_York")).toBe("2026-01-05T14:00:00.000Z")
    expect(iso({ year: 2026, month: 7, day: 5, hour: 9, minute: 0 }, "America/New_York")).toBe("2026-07-05T13:00:00.000Z")
    // Gap on 2026-03-08: 02:30 -> 03:30 EDT.
    expect(iso({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/New_York")).toBe("2026-03-08T07:30:00.000Z")
    // Overlap on 2026-11-01: 01:30 EDT first.
    expect(iso({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York")).toBe("2026-11-01T05:30:00.000Z")
  })

  it("Asia/Kolkata is +5:30", () => {
    expect(iso({ year: 2026, month: 11, day: 3, hour: 0, minute: 0 }, "Asia/Kolkata")).toBe("2026-11-02T18:30:00.000Z")
    expect(utcToZoned(new Date("2026-11-02T18:29:00Z"), "Asia/Kolkata")).toEqual({
      year: 2026, month: 11, day: 2, hour: 23, minute: 59, weekday: 1,
    })
  })

  it("weekday is 0 for Sunday", () => {
    expect(utcToZoned(new Date("2026-11-01T12:00:00Z"), "Africa/Lagos").weekday).toBe(0)
  })

  it("isValidTimeZone", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true)
    expect(isValidTimeZone("UTC")).toBe(true)
    expect(isValidTimeZone("Mars/Olympus")).toBe(false)
    expect(isValidTimeZone("")).toBe(false)
  })

  it("property: utcToZoned then zonedToUtc round-trips (minute precision)", () => {
    const zones = ["Africa/Lagos", "Europe/London", "America/New_York", "Asia/Kolkata"]
    fc.assert(
      fc.property(fc.integer({ min: 1_600_000_000, max: 2_000_000_000 }), fc.constantFrom(...zones), (sec, tz) => {
        const t = Math.floor(sec / 60) * 60_000
        const back = zonedToUtc(utcToZoned(new Date(t), tz), tz).getTime()
        // In an overlap the earlier instant wins, so it may be one hour earlier.
        expect(back === t || back === t - 3_600_000).toBe(true)
      }),
    )
  })
})
