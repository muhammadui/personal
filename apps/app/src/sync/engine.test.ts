import { newId } from "@personal/core"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PersonalDb, deleteLocalData } from "../data/db"
import { Store } from "../data/store"
import { SyncEngine } from "./engine"
import { FakeSyncServer } from "./fake-server"

const cleanup: (() => Promise<void> | void)[] = []
afterEach(async () => {
  vi.useRealTimers()
  for (const c of cleanup.splice(0)) await c()
})

function device(server: FakeSyncServer, userId = newId(), deviceId = "d" + Math.random().toString(36).slice(2, 8)) {
  const db = new PersonalDb(`${userId}-${deviceId}`)
  const store = new Store(db, deviceId)
  const engine = new SyncEngine(store, { fetch: server.fetch, openSocket: () => null, random: () => 1, debounceMs: 0 })
  cleanup.push(async () => {
    engine.stop()
    db.close()
    await deleteLocalData(`${userId}-${deviceId}`)
  })
  return { db, store, engine }
}

const task = (title: string) => ({
  list_id: null,
  title,
  due_has_time: false,
  priority: "none" as const,
  status: "open" as const,
  flagged: false,
  sort_order: 1,
})

describe("SyncEngine", () => {
  it("queues writes while offline and pushes them in order once back online", async () => {
    const server = new FakeSyncServer()
    const a = device(server)
    server.offline = true
    const id = await a.store.create("tasks", task("Offline 1"))
    await a.store.update("tasks", id, { title: "Offline 2" })
    await a.engine.syncNow()
    expect(await a.store.pendingCount()).toBe(2)
    expect(a.engine.getStatus().lastError).toBeTruthy()

    server.offline = false
    await a.engine.syncNow()
    expect(await a.store.pendingCount()).toBe(0)
    expect([...server.records.values()][0]?.state.data.title).toBe("Offline 2")
  })

  it("retries after a network error with exponential backoff and jitter", async () => {
    const server = new FakeSyncServer()
    const db = new PersonalDb(newId())
    const store = new Store(db, "retry")
    // 20 ms base so the test runs in real time: retries at ~20 ms, then ~40 ms.
    const engine = new SyncEngine(store, { fetch: server.fetch, openSocket: () => null, random: () => 1, backoffBaseMs: 20 })
    cleanup.push(async () => {
      engine.stop()
      db.close()
      await deleteLocalData(db.userId)
    })
    ;(engine as unknown as { stopped: boolean }).stopped = false // allow retries without start()
    await store.create("tasks", task("x"))
    server.failNext = 2
    const callsBefore = server.pushCalls
    await engine.syncNow() // 503 -> retry scheduled
    expect(await store.pendingCount()).toBe(1)
    await new Promise((r) => setTimeout(r, 30)) // first retry: 503 again
    expect(await store.pendingCount()).toBe(1)
    await new Promise((r) => setTimeout(r, 80)) // second retry succeeds
    expect(await store.pendingCount()).toBe(0)
    expect(server.pushCalls - callsBefore).toBe(1) // the two 503s never reached push()
  })

  it("computes backoff delays from 1 s up to a 60 s cap", () => {
    const server = new FakeSyncServer()
    const lo = new SyncEngine(device(server).store, { random: () => 0, openSocket: () => null })
    const hi = new SyncEngine(device(server).store, { random: () => 1, openSocket: () => null })
    expect(hi.backoffDelay(0)).toBe(1000)
    expect(hi.backoffDelay(3)).toBe(8000)
    expect(hi.backoffDelay(20)).toBe(60_000)
    expect(lo.backoffDelay(3)).toBe(4000)
  })

  it("resumes after a restart: the outbox and cursor survive in IndexedDB", async () => {
    const server = new FakeSyncServer()
    const userId = newId()
    const first = device(server, userId, "dev1")
    server.offline = true
    await first.store.create("tasks", task("Before restart"))
    first.engine.stop()
    first.db.close()

    // "Restart": a new database handle and engine for the same user and device.
    server.offline = false
    const db = new PersonalDb(`${userId}-dev1`)
    const store = new Store(db, "dev1")
    const engine = new SyncEngine(store, { fetch: server.fetch, openSocket: () => null })
    cleanup.push(() => {
      engine.stop()
      db.close()
    })
    await engine.syncNow()
    expect(await store.pendingCount()).toBe(0)
    expect(server.records.size).toBe(1)
    expect(await store.cursor()).toBe(server.version)
  })

  it("brings another device's changes down on pull", async () => {
    const server = new FakeSyncServer()
    const userId = newId()
    const a = device(server, userId, "laptop")
    const b = device(server, userId, "phone")
    const id = await a.store.create("tasks", task("From laptop"))
    await a.engine.syncNow()
    await b.engine.syncNow()
    expect((await b.db.tasks.get(id))?.title).toBe("From laptop")
  })

  it("drops rejected mutations, raises a sync notice and keeps going", async () => {
    const server = new FakeSyncServer()
    const a = device(server)
    // A partial update to a record the server never saw is rejected (record_missing).
    await a.store.update("tasks", newId(), { title: "orphan" })
    const good = await a.store.create("tasks", task("good"))
    await a.engine.syncNow()
    expect(await a.db.outbox.count()).toBe(0)
    expect(server.records.has(`tasks:${good}`)).toBe(true)
    const notices = await a.db.notifications.toArray()
    expect(notices.some((n) => n.kind === "sync")).toBe(true)
  })

  it("stops and asks for sign-in on 401, keeping the outbox", async () => {
    const server = new FakeSyncServer()
    const a = device(server)
    await a.store.create("tasks", task("x"))
    server.unauthorized = true
    await a.engine.syncNow()
    expect(a.engine.getStatus().needsSignIn).toBe(true)
    expect(await a.store.pendingCount()).toBe(1)
  })
})
