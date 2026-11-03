import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import { addTask } from "./actions"
import { PersonalDb, deleteLocalData } from "./db"
import { purgeLocalTombstones, updateWaitingNotice, waitingNoticeId, WAITING_AFTER_MS } from "./maintenance"
import { Store } from "./store"

const users: string[] = []
afterEach(async () => {
  for (const u of users.splice(0)) await deleteLocalData(u)
})

function makeStore(now: () => number) {
  const userId = newId()
  users.push(userId)
  return new Store(new PersonalDb(userId), "devA", now)
}

describe("changes waiting notice", () => {
  it("appears after 10 minutes online with unsynced changes, and clears once they sync", async () => {
    let t = Date.parse("2026-11-03T10:00:00.000Z")
    const store = makeStore(() => t)
    await addTask(store, { title: "a" })
    await updateWaitingNotice(store, true, t + 60_000)
    expect(await store.db.notifications.get(waitingNoticeId("devA"))).toBeUndefined()

    t += WAITING_AFTER_MS + 1000
    await updateWaitingNotice(store, true, t)
    expect((await store.db.notifications.get(waitingNoticeId("devA")))?.title).toBe("1 change waiting to sync")

    // Offline does not raise it (offline is expected and calm).
    await store.db.notifications.delete(waitingNoticeId("devA"))
    await updateWaitingNotice(store, false, t)
    expect(await store.db.notifications.get(waitingNoticeId("devA"))).toBeUndefined()

    await updateWaitingNotice(store, true, t)
    await store.db.outbox.clear() // pushed
    await updateWaitingNotice(store, true, t)
    expect((await store.db.notifications.get(waitingNoticeId("devA")))?.read_at).toBeTruthy()
  })
})

describe("local purge", () => {
  it("removes records deleted more than 30 days ago, keeps recent Trash", async () => {
    let t = Date.parse("2026-10-01T10:00:00.000Z")
    const store = makeStore(() => t)
    const old = await addTask(store, { title: "old" })
    await store.remove("tasks", old)
    t = Date.parse("2026-10-30T10:00:00.000Z")
    const recent = await addTask(store, { title: "recent" })
    await store.remove("tasks", recent)
    const purged = await purgeLocalTombstones(store, Date.parse("2026-11-03T10:00:00.000Z"))
    expect(purged).toBe(1)
    expect(await store.db.tasks.get(old)).toBeUndefined()
    expect(await store.db.tasks.get(recent)).toBeDefined()
  })
})
