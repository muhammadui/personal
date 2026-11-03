import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import { addNote, addTask } from "./actions"
import { PersonalDb, deleteLocalData } from "./db"
import { buildSearchDocs, SearchIndex } from "./search"
import { Store } from "./store"

const users: string[] = []
afterEach(async () => {
  for (const u of users.splice(0)) await deleteLocalData(u)
})

async function setup() {
  const userId = newId()
  users.push(userId)
  const store = new Store(new PersonalDb(userId), "dev")
  const noteId = await addNote(store)
  await store.update("notes", noteId, { title: "Trip to Kano", plain_text: "Book the bus and pack the charger" })
  const locked = await addNote(store)
  await store.update("notes", locked, { title: "Bank", plain_text: "secret pin 1234", locked: true })
  await addTask(store, { title: "Pay electricity bill", notes: "NEPA token" })
  const gone = await addTask(store, { title: "Old charger task" })
  await store.remove("tasks", gone)
  const index = new SearchIndex()
  index.load(await buildSearchDocs(store.db))
  return { index, noteId }
}

describe("offline search", () => {
  it("finds notes by body text and tasks by title or notes, with prefixes", async () => {
    const { index, noteId } = await setup()
    expect(index.search("charg").map((h) => h.id)).toEqual([noteId])
    expect(index.search("electric")[0]?.title).toBe("Pay electricity bill")
    expect(index.search("nepa")[0]?.kind).toBe("task")
  })

  it("never indexes a locked note's content, and skips deleted items", async () => {
    const { index } = await setup()
    expect(index.search("secret")).toEqual([])
    expect(index.search("bank").map((h) => h.title)).toEqual(["Bank"])
    expect(index.search("old charger")).toEqual([])
  })

  it("returns a short snippet around the match", async () => {
    const { index } = await setup()
    expect(index.search("bus")[0]?.snippet).toContain("Book the bus")
  })
})
