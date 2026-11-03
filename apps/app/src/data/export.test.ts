import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import * as Y from "yjs"
import { addNote, addTask } from "./actions"
import { PersonalDb, deleteLocalData } from "./db"
import { buildExport } from "./export"
import { Store } from "./store"

const users: string[] = []
afterEach(async () => {
  for (const u of users.splice(0)) await deleteLocalData(u)
})

describe("export", () => {
  it("includes every record and note bodies as text, without HLC internals", async () => {
    const userId = newId()
    users.push(userId)
    const store = new Store(new PersonalDb(userId), "dev")
    await addTask(store, { title: "Pay bill" })
    const noteId = await addNote(store)
    const doc = new Y.Doc()
    doc.on("update", (u: Uint8Array) => void store.writeDocUpdate(noteId, u))
    const h = new Y.XmlElement("heading")
    h.setAttribute("level", "2" as never)
    h.insert(0, [new Y.XmlText("Groceries")])
    const p = new Y.XmlElement("paragraph")
    p.insert(0, [new Y.XmlText("Rice and beans")])
    doc.getXmlFragment("default").insert(0, [h, p])
    await new Promise((r) => setTimeout(r, 20))

    const out = await buildExport(store)
    expect(out.records.tasks).toHaveLength(1)
    expect(JSON.stringify(out.records)).not.toContain("_hlc")
    expect(out.note_bodies[0]?.text).toBe("## Groceries\nRice and beans")
  })
})
