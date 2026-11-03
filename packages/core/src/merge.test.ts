import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { mergeFields, mergeRemote, type RecordState } from "./merge"
import { serializeHlc } from "./hlc"

const hlcArb = fc
  .record({ wall: fc.integer({ min: 1, max: 1000 }), counter: fc.integer({ min: 0, max: 3 }), deviceId: fc.constantFrom("a", "b", "c") })
  .map(serializeHlc)
const writeArb = fc.record({
  fields: fc.dictionary(fc.constantFrom("title", "due_at", "status", "deleted_at"), fc.oneof(fc.string({ maxLength: 4 }), fc.constant(null)), { minKeys: 1 }),
  hlc: hlcArb,
})

function applyAll(writes: { fields: Record<string, unknown>; hlc: string }[]): RecordState | undefined {
  let s: RecordState | undefined
  for (const w of writes) s = mergeFields(s, w.fields, w.hlc).state
  return s
}

describe("mergeFields", () => {
  it("keeps the later write per field", () => {
    const a = mergeFields(undefined, { title: "a", due_at: "x" }, "000000000000001-00000-a").state
    const b = mergeFields(a, { title: "b" }, "000000000000002-00000-b").state
    const c = mergeFields(b, { title: "old", due_at: "y" }, "000000000000000-00009-c").state
    expect(c.data).toEqual({ title: "b", due_at: "x" })
  })

  it("is order-independent (any delivery order converges) when HLCs are unique", () => {
    fc.assert(
      fc.property(fc.uniqueArray(writeArb, { selector: (w) => w.hlc, maxLength: 12 }), (writes) => {
        const forward = applyAll(writes)
        const shuffled = applyAll([...writes].reverse())
        expect(shuffled).toEqual(forward)
      }),
    )
  })

  it("is idempotent (duplicate deliveries change nothing)", () => {
    fc.assert(
      fc.property(fc.uniqueArray(writeArb, { selector: (w) => w.hlc, maxLength: 12 }), (writes) => {
        expect(applyAll([...writes, ...writes])).toEqual(applyAll(writes))
      }),
    )
  })

  it("an edit never clears a tombstone (delete vs edit)", () => {
    const deleted = mergeFields(undefined, { title: "t", deleted_at: "2026-01-01T00:00:00.000Z" }, "000000000000005-00000-a").state
    const edited = mergeFields(deleted, { title: "edited" }, "000000000000009-00000-b").state
    expect(edited.data).toEqual({ title: "edited", deleted_at: "2026-01-01T00:00:00.000Z" })
  })
})

describe("mergeRemote", () => {
  it("converges with mergeFields: server state merged into any device gives the same result", () => {
    fc.assert(
      fc.property(fc.uniqueArray(writeArb, { selector: (w) => w.hlc, maxLength: 12 }), fc.integer({ min: 0, max: 12 }), (writes, split) => {
        const server = applyAll(writes)
        const device = applyAll(writes.slice(0, split))
        if (!server) return
        expect(mergeRemote(device, server).state).toEqual(server)
      }),
    )
  })
})
