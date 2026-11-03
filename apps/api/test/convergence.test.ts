/**
 * Gate 1 (docs/roadmap.md, task P0-11): random offline edits on 2–3 simulated devices,
 * real server sync code against test Postgres, random offline periods, random delivery
 * order and duplicate deliveries. After everyone syncs, every device and the server must
 * hold identical records and identical note bodies.
 *
 *   pnpm test                 -> CONVERGENCE_RUNS default (quick)
 *   pnpm test:convergence     -> 5,000 runs
 */
import {
  base64ToBytes,
  bytesToBase64,
  createHlc,
  maxHlc,
  mergeFields,
  mergeRemote,
  newId,
  receiveHlc,
  serializeHlc,
  tickHlc,
  type DocUpdate,
  type HlcState,
  type Mutation,
  type RecordState,
} from "@personal/core"
import fc from "fast-check"
import postgres from "postgres"
import { afterAll, describe, expect, it } from "vitest"
import * as Y from "yjs"
import { applyPush } from "../src/sync/push"
import { pull } from "../src/sync/pull"
import { APP_DB_URL } from "./helpers"

const RUNS = Number(process.env.CONVERGENCE_RUNS ?? 40)
const sql = postgres(APP_DB_URL, { max: 4, onnotice: () => {}, fetch_types: false })
afterAll(() => sql.end())

const RECORD_IDS = [newId(), newId(), newId()]
const NOTE_IDS = [newId(), newId()]
const BASE_TIME = Date.now() - 3_600_000

class SimDevice {
  clock: HlcState
  records = new Map<string, RecordState>()
  outbox: Mutation[] = []
  docOutbox: DocUpdate[] = []
  docs = new Map<string, Y.Doc>()
  cursor = 0
  online = true
  lastBatch: { mutations: Mutation[]; docUpdates: DocUpdate[] } | null = null

  constructor(
    readonly name: string,
    private readonly skewMs: number,
    private readonly time: { now: number },
  ) {
    this.clock = createHlc(name, this.now())
  }

  now() {
    return this.time.now + this.skewMs
  }

  private stamp(): string {
    this.clock = tickHlc(this.clock, this.now())
    return serializeHlc(this.clock)
  }

  write(id: string, fields: Record<string, unknown>, op: Mutation["op"] = "upsert") {
    const hlc = this.stamp()
    this.records.set(id, mergeFields(this.records.get(id), fields, hlc).state)
    this.outbox.push({ id: newId(), table: "tasks", recordId: id, op, fields, hlc })
  }

  doc(noteId: string): Y.Doc {
    let d = this.docs.get(noteId)
    if (!d) {
      d = new Y.Doc()
      d.on("update", (u: Uint8Array, origin: unknown) => {
        if (origin !== "remote") this.docOutbox.push({ id: newId(), noteId, update: bytesToBase64(u) })
      })
      this.docs.set(noteId, d)
    }
    return d
  }

  async sync(userId: string, duplicate: boolean) {
    if (!this.online) return
    while (this.outbox.length > 0 || this.docOutbox.length > 0) {
      const batch = { mutations: this.outbox.slice(0, 200), docUpdates: this.docOutbox.slice(0, 50) }
      const res = await applyPush(sql, userId, { deviceId: this.name, ...batch }, this.time.now)
      if (!res.ok) throw new Error(res.message)
      expect(res.response.rejected).toEqual([])
      if (duplicate) {
        // The response was "lost": the device retries the same batch, which must apply once.
        const again = await applyPush(sql, userId, { deviceId: this.name, ...batch }, this.time.now)
        if (!again.ok) throw new Error(again.message)
        expect(again.response.applied).toEqual([])
      }
      const done = new Set([...res.response.applied, ...res.response.duplicates])
      this.outbox = this.outbox.filter((m) => !done.has(m.id))
      this.docOutbox = this.docOutbox.filter((d) => !done.has(d.id))
      this.lastBatch = batch
    }
    for (;;) {
      const page = await pull(sql, userId, this.cursor, 50)
      for (const c of page.changes) {
        this.records.set(c.id, mergeRemote(this.records.get(c.id), { data: c.data, fieldHlc: c.fieldHlc }).state)
        const top = maxHlc(c.fieldHlc)
        if (top) this.clock = receiveHlc(this.clock, top, this.now())
      }
      for (const d of page.docs) Y.applyUpdate(this.doc(d.noteId), base64ToBytes(d.update), "remote")
      this.cursor = page.cursor
      if (!page.hasMore) break
    }
  }
}

type Op =
  | { kind: "create"; device: number; rec: number; title: string }
  | { kind: "edit"; device: number; rec: number; field: "title" | "priority" | "flagged" | "due_at"; value: string | boolean | null }
  | { kind: "delete"; device: number; rec: number }
  | { kind: "restore"; device: number; rec: number }
  | { kind: "doc"; device: number; note: number; text: string; at: number }
  | { kind: "offline"; device: number }
  | { kind: "online"; device: number }
  | { kind: "sync"; device: number; duplicate: boolean }
  | { kind: "tick"; ms: number }

const dev = fc.integer({ min: 0, max: 2 })
const rec = fc.integer({ min: 0, max: RECORD_IDS.length - 1 })
const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant("create" as const), device: dev, rec, title: fc.string({ maxLength: 6 }) }),
  fc.record({
    kind: fc.constant("edit" as const),
    device: dev,
    rec,
    field: fc.constantFrom("title" as const, "priority" as const, "flagged" as const, "due_at" as const),
    value: fc.oneof(fc.string({ maxLength: 5 }), fc.boolean(), fc.constant(null)),
  }),
  fc.record({ kind: fc.constant("delete" as const), device: dev, rec }),
  fc.record({ kind: fc.constant("restore" as const), device: dev, rec }),
  fc.record({ kind: fc.constant("doc" as const), device: dev, note: fc.integer({ min: 0, max: NOTE_IDS.length - 1 }), text: fc.string({ minLength: 1, maxLength: 4 }), at: fc.nat(20) }),
  fc.record({ kind: fc.constant("offline" as const), device: dev }),
  fc.record({ kind: fc.constant("online" as const), device: dev }),
  fc.record({ kind: fc.constant("sync" as const), device: dev, duplicate: fc.boolean() }),
  fc.record({ kind: fc.constant("tick" as const), ms: fc.integer({ min: 1, max: 120_000 }) }),
)

function editFields(field: string, value: string | boolean | null): Record<string, unknown> | null {
  if (field === "title") return { title: typeof value === "string" ? value : "t" }
  if (field === "priority") return { priority: value === true ? "high" : value === false ? "low" : "none" }
  if (field === "flagged") return { flagged: Boolean(value) }
  if (field === "due_at") return { due_at: value === null ? null : new Date(BASE_TIME + 86_400_000).toISOString() }
  return null
}

async function runScenario(deviceCount: number, skews: number[], ops: Op[]) {
  const userId = newId()
  const time = { now: BASE_TIME }
  const devices = Array.from({ length: deviceCount }, (_, i) => new SimDevice(`dev${i}`, skews[i] ?? 0, time))
  const iso = () => new Date(time.now).toISOString()

  for (const op of ops) {
    if (op.kind === "tick") {
      time.now += op.ms
      continue
    }
    const d = devices[op.device % deviceCount]!
    switch (op.kind) {
      case "create": {
        const id = RECORD_IDS[op.rec]!
        if (d.records.has(id)) break
        d.write(id, { created_at: iso(), updated_at: iso(), title: op.title, due_has_time: false, priority: "none", status: "open", flagged: false, sort_order: op.rec })
        break
      }
      case "edit": {
        const id = RECORD_IDS[op.rec]!
        const fields = editFields(op.field, op.value)
        if (d.records.has(id) && fields) d.write(id, fields)
        break
      }
      case "delete":
        if (d.records.has(RECORD_IDS[op.rec]!)) d.write(RECORD_IDS[op.rec]!, { deleted_at: iso() }, "delete")
        break
      case "restore":
        if (d.records.has(RECORD_IDS[op.rec]!)) d.write(RECORD_IDS[op.rec]!, { deleted_at: null })
        break
      case "doc": {
        const text = d.doc(NOTE_IDS[op.note]!).getText("body")
        text.insert(Math.min(op.at, text.length), op.text)
        break
      }
      case "offline":
        d.online = false
        break
      case "online":
        d.online = true
        break
      case "sync":
        await d.sync(userId, op.duplicate)
        break
    }
  }

  // Everyone comes back online; two rounds so every device sees every other device's writes.
  for (const d of devices) d.online = true
  for (let round = 0; round < 2; round++) for (const d of devices) await d.sync(userId, false)

  const server = await pull(sql, userId, 0, 1000)
  const serverRecords = new Map(server.changes.map((c) => [c.id, c.data]))
  const serverDocs = new Map<string, Y.Doc>()
  for (const u of server.docs) {
    const doc = serverDocs.get(u.noteId) ?? new Y.Doc()
    Y.applyUpdate(doc, base64ToBytes(u.update))
    serverDocs.set(u.noteId, doc)
  }

  for (const d of devices) {
    expect(d.outbox).toEqual([])
    expect(new Map([...d.records].map(([id, s]) => [id, s.data]))).toEqual(serverRecords)
    for (const noteId of NOTE_IDS) {
      const serverText = serverDocs.get(noteId)?.getText("body").toString() ?? ""
      expect(d.docs.get(noteId)?.getText("body").toString() ?? "").toBe(serverText)
    }
  }
}

describe("convergence (Gate 1)", () => {
  it(`random offline edits on 2–3 devices converge (${RUNS} runs)`, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }),
        fc.array(fc.integer({ min: -600_000, max: 600_000 }), { minLength: 3, maxLength: 3 }),
        fc.array(opArb, { minLength: 5, maxLength: 40 }),
        runScenario,
      ),
      { numRuns: RUNS },
    )
  }, 3_600_000)

  it("a device clock 10 minutes fast does not permanently win against a later real edit", async () => {
    const userId = newId()
    const time = { now: BASE_TIME }
    const fast = new SimDevice("fast", 10 * 60_000, time)
    const honest = new SimDevice("honest", 0, time)
    const id = newId()
    fast.write(id, { created_at: new Date(time.now).toISOString(), updated_at: new Date(time.now).toISOString(), title: "from fast", due_has_time: false, priority: "none", status: "open", flagged: false, sort_order: 0 })
    await fast.sync(userId, false)
    await honest.sync(userId, false) // honest sees the fast stamp and advances its clock past it
    time.now += 1_000
    honest.write(id, { title: "later real edit" })
    await honest.sync(userId, false)
    await fast.sync(userId, false)
    expect(fast.records.get(id)?.data.title).toBe("later real edit")
    expect(honest.records.get(id)?.data.title).toBe("later real edit")
  })
})
