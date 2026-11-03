import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import * as Y from "yjs"
import { PersonalDb, deleteLocalData } from "../data/db"
import { Store } from "../data/store"
import { SyncEngine } from "./engine"
import { FakeSyncServer } from "./fake-server"
import { compactNoteDoc, openNoteDoc } from "./note-docs"

const cleanup: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const c of cleanup.splice(0)) await c()
})

function device(server: FakeSyncServer, name: string) {
  const dbName = `${newId()}-${name}`
  const db = new PersonalDb(dbName)
  const store = new Store(db, name)
  const engine = new SyncEngine(store, { fetch: server.fetch, openSocket: () => null })
  cleanup.push(async () => {
    db.close()
    await deleteLocalData(dbName)
  })
  return { db, store, engine }
}

const flush = () => new Promise((r) => setTimeout(r, 10))

describe("note docs", () => {
  it("two devices editing the same note offline converge after sync, keeping both edits", async () => {
    const server = new FakeSyncServer()
    const laptop = device(server, "laptop")
    const phone = device(server, "phone")
    const noteId = newId()

    // Shared starting point.
    const a = openNoteDoc(laptop.store, noteId)
    await a.ready
    a.doc.getText("t").insert(0, "Shopping list")
    await flush()
    await laptop.engine.syncNow()
    await phone.engine.syncNow()
    const b = openNoteDoc(phone.store, noteId)
    await b.ready
    expect(b.doc.getText("t").toString()).toBe("Shopping list")

    // Both go offline and edit different places.
    server.offline = true
    a.doc.getText("t").insert(0, "Weekend ")
    b.doc.getText("t").insert(b.doc.getText("t").length, ": eggs, rice")
    await flush()
    await laptop.engine.syncNow()
    await phone.engine.syncNow()

    server.offline = false
    await laptop.engine.syncNow()
    await phone.engine.syncNow()
    await laptop.engine.syncNow()
    await flush()

    expect(a.doc.getText("t").toString()).toBe("Weekend Shopping list: eggs, rice")
    expect(b.doc.getText("t").toString()).toBe(a.doc.getText("t").toString())
    a.close()
    b.close()
  })

  it("a note reopened from the local log has the same content (survives restart)", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "solo")
    const noteId = newId()
    const first = openNoteDoc(d.store, noteId)
    await first.ready
    first.doc.getText("t").insert(0, "Hello")
    first.doc.getText("t").insert(5, " world")
    await flush()
    first.close()
    const again = openNoteDoc(d.store, noteId)
    await again.ready
    expect(again.doc.getText("t").toString()).toBe("Hello world")
    again.close()
  })

  it("compaction replaces the log with one update and lets the server drop old ones", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "compact")
    const other = device(server, "other")
    const noteId = newId()
    const open = openNoteDoc(d.store, noteId)
    await open.ready
    for (let i = 0; i < 5; i++) open.doc.getText("t").insert(0, String(i))
    await flush()
    await d.engine.syncNow()
    expect(server.docs.filter((x) => x.noteId === noteId)).toHaveLength(5)

    expect(await compactNoteDoc(d.store, noteId, 2)).toBe(true)
    await d.engine.syncNow()
    expect(server.docs.filter((x) => x.noteId === noteId)).toHaveLength(1)
    expect(await d.db.doc_updates.where("note_id").equals(noteId).count()).toBe(1)

    await other.engine.syncNow()
    const fresh = new Y.Doc()
    for (const r of await other.db.doc_updates.where("note_id").equals(noteId).toArray()) Y.applyUpdate(fresh, r.update)
    expect(fresh.getText("t").toString()).toBe("43210")
    open.close()
  })
})
