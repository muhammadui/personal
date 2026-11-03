import fc from "fast-check"
import { describe, expect, it } from "vitest"
import {
  compareHlc,
  createHlc,
  HlcError,
  parseHlc,
  receiveHlc,
  serializeHlc,
  tickHlc,
  type HlcState,
} from "./hlc"

const deviceArb = fc.stringMatching(/^[a-z0-9]{4,12}$/)
const wallArb = fc.integer({ min: 1_600_000_000_000, max: 2_000_000_000_000 })

describe("hlc", () => {
  it("serialises to the documented format", () => {
    const s = serializeHlc({ wall: 1793667275, counter: 3, deviceId: "dev1" })
    expect(s).toBe("000001793667275-00003-dev1")
    expect(parseHlc(s)).toEqual({ wall: 1793667275, counter: 3, deviceId: "dev1" })
  })

  it("rejects malformed stamps", () => {
    expect(() => parseHlc("123-1-x")).toThrow(HlcError)
    expect(() => createHlc("bad id!")).toThrow(HlcError)
  })

  it("is strictly monotonic for any sequence of clock readings, even when time goes backwards", () => {
    fc.assert(
      fc.property(deviceArb, wallArb, fc.array(fc.integer({ min: -5_000, max: 5_000 }), { maxLength: 200 }), (dev, start, deltas) => {
        let state = createHlc(dev, start)
        let prev = serializeHlc(state)
        let now = start
        for (const d of deltas) {
          now += d
          state = tickHlc(state, now)
          const s = serializeHlc(state)
          expect(compareHlc(s, prev)).toBe(1)
          prev = s
        }
      }),
    )
  })

  it("string order matches (wall, counter, device) order", () => {
    const stateArb = fc.record({ wall: wallArb, counter: fc.integer({ min: 0, max: 99_999 }), deviceId: deviceArb })
    fc.assert(
      fc.property(stateArb, stateArb, (a: HlcState, b: HlcState) => {
        const tuple = (x: HlcState) => [x.wall, x.counter, x.deviceId] as const
        const [aw, ac, ad] = tuple(a)
        const [bw, bc, bd] = tuple(b)
        const expected = aw !== bw ? Math.sign(aw - bw) : ac !== bc ? Math.sign(ac - bc) : ad < bd ? -1 : ad > bd ? 1 : 0
        expect(compareHlc(serializeHlc(a), serializeHlc(b))).toBe(expected)
      }),
    )
  })

  it("after receiving a remote stamp, the next local stamp sorts after it", () => {
    fc.assert(
      fc.property(deviceArb, deviceArb, wallArb, fc.integer({ min: -600_000, max: 600_000 }), (d1, d2, now, skew) => {
        const local = createHlc(d1 + "a", now)
        const remote = serializeHlc(tickHlc(createHlc(d2 + "b", now + skew), now + skew))
        const merged = tickHlc(receiveHlc(local, remote, now), now)
        expect(compareHlc(serializeHlc(merged), remote)).toBe(1)
      }),
    )
  })

  it("recovers from a device clock 10 minutes fast: a later real edit wins after exchange", () => {
    const realNow = 1_800_000_000_000
    const fast = createHlc("fast", realNow + 10 * 60_000)
    const fastStamp = serializeHlc(tickHlc(fast, realNow + 10 * 60_000))

    // The honest device sees the fast device's stamp, then edits one second later in real time.
    let honest = createHlc("honest", realNow)
    honest = receiveHlc(honest, fastStamp, realNow + 1_000)
    const honestEdit = serializeHlc(tickHlc(honest, realNow + 1_000))
    expect(compareHlc(honestEdit, fastStamp)).toBe(1)

    // And the honest clock does not stay pinned in the future: once real time passes the
    // fast stamp, new stamps track real time again.
    const later = tickHlc(honest, realNow + 11 * 60_000)
    expect(later.wall).toBe(realNow + 11 * 60_000)
    expect(later.counter).toBe(0)
  })

  it("rejects remote stamps more than 24 hours ahead", () => {
    const now = 1_800_000_000_000
    const far = serializeHlc({ wall: now + 25 * 3_600_000, counter: 0, deviceId: "x" })
    expect(() => receiveHlc(createHlc("me", now), far, now)).toThrow(HlcError)
  })

  it("rolls the wall forward instead of overflowing the counter", () => {
    const s = tickHlc({ wall: 5, counter: 99_999, deviceId: "d" }, 1)
    expect(s).toEqual({ wall: 6, counter: 0, deviceId: "d" })
  })
})
