import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import { PersonalDb, deleteLocalData } from "./db"
import { Store, WriteError } from "./store"

const userIds: string[] = []
function makeStore(now = () => Date.now()) {
  const userId = newId()
  userIds.push(userId)
  return new Store(new PersonalDb(userId), "device1", now)
}
afterEach(async () => {
  for (const id of userIds.splice(0)) await deleteLocalData(id)
})

const task = {
  list_id: null,
  title: "Pay bill",
  due_has_time: false,
  priority: "none" as const,
  status: "open" as const,
  flagged: false,
  sort_order: 1,
}

describe("Store", () => {
  it("writes the record, its HLC map and one outbox mutation together", async () => {
    const store = makeStore()
    const id = await store.create("tasks", task)
    const row = await store.db.tasks.get(id)
    expect(row?.title).toBe("Pay bill")
    expect(Object.keys(row!._hlc)).toContain("title")
    const outbox = await store.db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]!.mutation).toMatchObject({ table: "tasks", recordId: id, op: "upsert" })
    expect(outbox[0]!.mutation.hlc).toBe(row!._hlc.title)
  })

  it("a failed write leaves neither the record nor an outbox entry", async () => {
    const store = makeStore()
    const id = newId()
    // Make the outbox insert fail inside the transaction.
    store.db.outbox.hook("creating", () => {
      throw new Error("disk full")
    })
    await expect(store.create("tasks", task, id)).rejects.toThrow("disk full")
    expect(await store.db.tasks.get(id)).toBeUndefined()
    expect(await store.db.outbox.count()).toBe(0)
  })

  it("rejects invalid fields before touching the database", async () => {
    const store = makeStore()
    await expect(store.create("tasks", { ...task, priority: "urgent" as never })).rejects.toBeInstanceOf(WriteError)
    expect(await store.db.outbox.count()).toBe(0)
  })

  it("stamps successive writes with increasing HLCs even if the clock goes backwards", async () => {
    let t = 1_800_000_000_000
    const store = makeStore(() => t)
    const id = await store.create("tasks", task)
    t -= 60_000
    await store.update("tasks", id, { title: "Second" })
    const [a, b] = (await store.db.outbox.orderBy("seq").toArray()).map((e) => e.mutation.hlc)
    expect(b! > a!).toBe(true)
    expect((await store.db.tasks.get(id))?.title).toBe("Second")
  })

  it("delete is a tombstone and restore clears it", async () => {
    const store = makeStore()
    const id = await store.create("tasks", task)
    await store.remove("tasks", id)
    expect((await store.db.tasks.get(id))?.deleted_at).toBeTruthy()
    const del = (await store.db.outbox.toArray()).at(-1)!.mutation
    expect(del).toMatchObject({ op: "delete", fields: { deleted_at: expect.any(String) } })
    await store.restore("tasks", id)
    expect((await store.db.tasks.get(id))?.deleted_at).toBeNull()
  })

  it("applies pulled rows per field and never lets an older remote value overwrite a newer local one", async () => {
    const store = makeStore()
    const id = await store.create("tasks", task)
    const local = await store.db.tasks.get(id)
    await store.applyRemote(
      [
        {
          table: "tasks",
          id,
          data: { title: "Older remote", priority: "high" },
          fieldHlc: { title: "000000000000001-00000-other", priority: "999999999999999-00000-other" },
          serverVersion: 5,
        },
      ],
      [],
      5,
    )
    const row = await store.db.tasks.get(id)
    expect(row?.title).toBe(local?.title)
    expect(row?.priority).toBe("high")
    expect(await store.cursor()).toBe(5)
    expect(await store.db.outbox.count()).toBe(1) // pulls never add to the outbox
  })

  it("writes Yjs updates to the local log and the doc outbox in one transaction", async () => {
    const store = makeStore()
    const noteId = newId()
    await store.writeDocUpdate(noteId, new Uint8Array([1, 2]))
    expect(await store.db.doc_updates.where("note_id").equals(noteId).count()).toBe(1)
    expect(await store.db.doc_outbox.count()).toBe(1)
  })
})
