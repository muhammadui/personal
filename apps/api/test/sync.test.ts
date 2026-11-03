import { bytesToBase64, newId, serializeHlc, type Mutation, type PullResponse, type PushResponse } from "@personal/core"
import postgres from "postgres"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { applyPush } from "../src/sync/push"
import { pull } from "../src/sync/pull"
import { APP_DB_URL, createTestServer, uniqueEmail } from "./helpers"

const emails = Array.from({ length: 12 }, (_, i) => uniqueEmail(`s${i}`))
const server = createTestServer({ allowedEmails: emails })
afterAll(() => server.close())

const now = "2026-11-03T10:00:00.000Z"
let clock = Date.now() - 3_600_000
const hlc = (device = "devA", wall?: number) => serializeHlc({ wall: wall ?? ++clock, counter: 0, deviceId: device })

function taskCreate(recordId = newId(), over: Record<string, unknown> = {}, device = "devA"): Mutation {
  return {
    id: newId(),
    table: "tasks",
    recordId,
    op: "upsert",
    hlc: hlc(device),
    fields: {
      created_at: now,
      updated_at: now,
      title: "Pay electricity bill",
      due_has_time: false,
      priority: "none",
      status: "open",
      flagged: false,
      sort_order: 1,
      ...over,
    },
  }
}

async function account(i: number) {
  const { cookie, body } = await server.signUp(emails[i]!)
  return { cookie, userId: body!.user!.id }
}

async function push(cookie: string, mutations: unknown[], docUpdates: unknown[] = [], deviceId = "devA") {
  const res = await server.request("/api/sync/push", { method: "POST", cookie, body: JSON.stringify({ deviceId, mutations, docUpdates }) })
  return { status: res.status, body: (await res.json()) as PushResponse }
}

async function pullAll(cookie: string, since = 0, limit = 1000) {
  const pages: PullResponse[] = []
  let cursor = since
  for (;;) {
    const res = await server.request(`/api/sync/pull?since=${cursor}&limit=${limit}`, { cookie })
    const page = (await res.json()) as PullResponse
    pages.push(page)
    cursor = page.cursor
    if (!page.hasMore) break
  }
  return { pages, changes: pages.flatMap((p) => p.changes), docs: pages.flatMap((p) => p.docs), cursor }
}

describe("POST /api/sync/push", () => {
  it("applies a batch once even when it is sent twice (idempotent retry)", async () => {
    const { cookie } = await account(0)
    const batch = [taskCreate(), taskCreate()]
    const first = await push(cookie, batch)
    expect(first.status).toBe(200)
    expect(first.body.applied).toHaveLength(2)
    const second = await push(cookie, batch)
    expect(second.body.applied).toHaveLength(0)
    expect(second.body.duplicates.sort()).toEqual(batch.map((m) => m.id).sort())
    expect(second.body.serverVersion).toBe(first.body.serverVersion)
  })

  it("resolves out-of-order arrival per field by HLC", async () => {
    const { cookie } = await account(1)
    const id = newId()
    await push(cookie, [taskCreate(id)])
    // Written in this order (by HLC): create < earlier < later. Delivered: create, later, earlier.
    const earlier = { id: newId(), table: "tasks", recordId: id, op: "upsert", hlc: hlc("devC"), fields: { title: "Old title", priority: "high" } }
    const later = { id: newId(), table: "tasks", recordId: id, op: "upsert", hlc: hlc("devB"), fields: { title: "New title" } }
    await push(cookie, [later], [], "devB")
    await push(cookie, [earlier], [], "devC") // arrives last, but is older
    const { changes } = await pullAll(cookie)
    const task = changes.find((c) => c.id === id)!
    expect(task.data.title).toBe("New title") // newer write kept
    expect(task.data.priority).toBe("high") // untouched field from the older write still applies
  })

  it("delete vs edit: the item stays deleted and keeps the edit, restore brings it back", async () => {
    const { cookie } = await account(2)
    const id = newId()
    await push(cookie, [taskCreate(id)])
    const del = { id: newId(), table: "tasks", recordId: id, op: "delete", hlc: hlc("devA"), fields: { deleted_at: now } }
    const edit = { id: newId(), table: "tasks", recordId: id, op: "upsert", hlc: hlc("devB"), fields: { title: "Edited offline" } }
    await push(cookie, [edit], [], "devB")
    await push(cookie, [del], [], "devA")
    let task = (await pullAll(cookie)).changes.find((c) => c.id === id)!
    expect(task.data.deleted_at).toBe(now)
    expect(task.data.title).toBe("Edited offline")
    const restore = { id: newId(), table: "tasks", recordId: id, op: "upsert", hlc: hlc("devA"), fields: { deleted_at: null } }
    await push(cookie, [restore])
    task = (await pullAll(cookie)).changes.find((c) => c.id === id)!
    expect(task.data.deleted_at).toBeNull()
  })

  it("rejects invalid mutations without blocking the rest of the batch", async () => {
    const { cookie } = await account(3)
    const good = taskCreate()
    const bad = { ...taskCreate(), fields: { priority: "urgent" } }
    const res = await push(cookie, [bad, good])
    expect(res.body.applied).toEqual([good.id])
    expect(res.body.rejected).toEqual([expect.objectContaining({ id: bad.id, code: "invalid" })])
  })

  it("rejects a partial update for a record that does not exist (record_missing)", async () => {
    const { cookie } = await account(4)
    const orphan = { id: newId(), table: "tasks", recordId: newId(), op: "upsert", hlc: hlc(), fields: { title: "x" } }
    const res = await push(cookie, [orphan])
    expect(res.body.rejected[0]).toMatchObject({ id: orphan.id, code: "record_missing" })
  })

  it("rejects a write from a clock more than 24 hours ahead", async () => {
    const { cookie } = await account(5)
    const future = { ...taskCreate(), hlc: serializeHlc({ wall: Date.now() + 2 * 86_400_000, counter: 0, deviceId: "devA" }) }
    const res = await push(cookie, [future])
    expect(res.body.rejected[0]).toMatchObject({ code: "clock" })
  })

  it("returns 400 for a malformed envelope", async () => {
    const { cookie } = await account(6)
    const res = await server.request("/api/sync/push", { method: "POST", cookie, body: JSON.stringify({ mutations: "x" }) })
    expect(res.status).toBe(400)
  })

  it("tells the hub what changed so other devices are poked", async () => {
    const { cookie, userId } = await account(7)
    const m = taskCreate()
    await push(cookie, [m], [], "devZ")
    const call = server.hub.pushes.find((p) => p.userId === userId && p.deviceId === "devZ")
    expect(call?.changed.map((c) => c.id)).toContain(m.recordId)
  })
})

describe("GET /api/sync/pull", () => {
  it("pages through 2,500 changes in version order without gaps or repeats", async () => {
    const { cookie } = await account(8)
    const created: string[] = []
    for (let b = 0; b < 13; b++) {
      const batch = Array.from({ length: b === 12 ? 100 : 200 }, () => taskCreate())
      created.push(...batch.map((m) => m.recordId))
      const res = await push(cookie, batch)
      expect(res.body.applied).toHaveLength(batch.length)
    }
    const { pages, changes } = await pullAll(cookie, 0, 1000)
    expect(pages.length).toBeGreaterThanOrEqual(3)
    const versions = changes.map((c) => c.serverVersion)
    expect([...versions].sort((a, b) => a - b)).toEqual(versions)
    expect(new Set(versions).size).toBe(versions.length)
    const taskIds = new Set(changes.filter((c) => c.table === "tasks").map((c) => c.id))
    expect(created.every((id) => taskIds.has(id))).toBe(true)
    expect(taskIds.size).toBe(2500)
  }, 60_000)

  it("validates query parameters", async () => {
    const { cookie } = await account(9)
    expect((await server.request("/api/sync/pull?since=-1", { cookie })).status).toBe(400)
    expect((await server.request("/api/sync/pull?since=abc", { cookie })).status).toBe(400)
  })
})

describe("doc updates", () => {
  it("stores opaque Yjs updates, returns them in the pull feed, and compacts", async () => {
    const { cookie } = await account(10)
    const noteId = newId()
    const u1 = { id: newId(), noteId, update: bytesToBase64(new Uint8Array([1, 2, 3])) }
    const u2 = { id: newId(), noteId, update: bytesToBase64(new Uint8Array([4, 5])) }
    const first = await push(cookie, [], [u1, u2])
    expect(first.body.applied).toEqual([u1.id, u2.id])
    expect((await push(cookie, [], [u1])).body.duplicates).toEqual([u1.id])
    let { docs } = await pullAll(cookie)
    expect(docs.filter((d) => d.noteId === noteId).map((d) => d.id)).toEqual([u1.id, u2.id])

    const snapshot = { id: newId(), noteId, update: bytesToBase64(new Uint8Array([9])), compactsUpTo: first.body.serverVersion }
    await push(cookie, [], [snapshot])
    docs = (await pullAll(cookie)).docs.filter((d) => d.noteId === noteId)
    expect(docs.map((d) => d.id)).toEqual([snapshot.id])
  })
})

describe("row-level security", () => {
  let userA: string
  let userB: string
  beforeAll(async () => {
    userA = (await account(11)).userId
    const other = uniqueEmail("rls")
    const s2 = createTestServer({ allowedEmails: [other] })
    userB = (await s2.signUp(other)).body!.user!.id
    await s2.close()
  })

  it("user A cannot read or write user B's rows, even with a query missing its user_id filter", async () => {
    const sql = postgres(APP_DB_URL, { max: 1, onnotice: () => {} })
    try {
      // A query with no user filter at all, scoped to A by RLS.
      const seen = await sql.begin(async (tx) => {
        await tx`SELECT set_config('app.user_id', ${userA}, true)`
        return tx<{ user_id: string }[]>`SELECT user_id FROM records`
      })
      expect(seen.length).toBeGreaterThan(0)
      expect(seen.every((r) => r.user_id === userA)).toBe(true)

      // Writing a row for B while scoped to A is refused.
      await expect(
        sql.begin(async (tx) => {
          await tx`SELECT set_config('app.user_id', ${userA}, true)`
          await tx`INSERT INTO records (user_id, tbl, id, data, field_hlc, server_version)
                   VALUES (${userB}, 'tasks', ${newId()}, '{}'::jsonb, '{}'::jsonb, 1)`
        }),
      ).rejects.toThrow(/row-level security/)

      // Updating or deleting B's rows while scoped to A touches nothing.
      const touched = await sql.begin(async (tx) => {
        await tx`SELECT set_config('app.user_id', ${userA}, true)`
        const u = await tx`UPDATE records SET data = '{}'::jsonb WHERE user_id = ${userB}`
        const d = await tx`DELETE FROM records WHERE user_id = ${userB}`
        return u.count + d.count
      })
      expect(touched).toBe(0)

      // With no user set at all, nothing is visible.
      const none = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM records`
      expect(none[0]?.n).toBe("0")
    } finally {
      await sql.end()
    }
  })

  it("the sync functions only ever see the caller's data", async () => {
    const page = await pull(server.db.sql, userA, 0, 1000)
    const bPage = await pull(server.db.sql, userB, 0, 1000)
    const aIds = new Set(page.changes.map((c) => c.id))
    expect(bPage.changes.some((c) => aIds.has(c.id))).toBe(false)
    // Pushing as A with B's settings id cannot alter B's settings.
    const res = await applyPush(server.db.sql, userA, {
      deviceId: "evil",
      mutations: [{ id: newId(), table: "settings", recordId: userB, op: "upsert", hlc: hlc("evil"), fields: { theme: "dark" } }],
      docUpdates: [],
    })
    expect(res.ok && res.response.rejected[0]?.code).toBe("record_missing")
    const bSettings = (await pull(server.db.sql, userB, 0, 1000)).changes.find((c) => c.table === "settings")
    expect(bSettings?.data.theme).toBe("system")
  })
})
