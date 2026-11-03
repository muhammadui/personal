import { newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import * as Y from "yjs"
import { addNote } from "../data/actions"
import { PersonalDb, deleteLocalData } from "../data/db"
import { Store } from "../data/store"
import { maybeHourlySnapshot, restoreVersion, versionPreview, versionsFor } from "./note-versions"

const users: string[] = []
afterEach(async () => {
  for (const u of users.splice(0)) await deleteLocalData(u)
})

function paragraph(text: string): Y.XmlElement {
  const p = new Y.XmlElement("paragraph")
  p.insert(0, [new Y.XmlText(text)])
  return p
}

describe("note versions", () => {
  it("takes at most one hourly snapshot and restores an older version", async () => {
    const userId = newId()
    users.push(userId)
    let t = Date.parse("2026-11-03T08:00:00.000Z")
    const store = new Store(new PersonalDb(userId), "dev", () => t)
    const noteId = await addNote(store)
    const doc = new Y.Doc()
    const body = doc.getXmlFragment("default")
    body.insert(0, [paragraph("First draft")])

    expect(await maybeHourlySnapshot(store, noteId, doc, t)).toBe(true)
    expect(await maybeHourlySnapshot(store, noteId, doc, t + 10 * 60_000)).toBe(false)

    body.delete(0, body.length)
    body.insert(0, [paragraph("Rewritten completely")])
    t += 2 * 60 * 60_000
    expect(await maybeHourlySnapshot(store, noteId, doc, t)).toBe(true)

    const versions = await versionsFor(store, noteId)
    expect(versions.map(versionPreview)).toEqual(["Rewritten completely", "First draft"])

    t += 1000 // the restore snapshot is taken a moment later
    await restoreVersion(store, noteId, doc, versions[1]!)
    expect(body.toString()).toBe("<paragraph>First draft</paragraph>")
    expect((await versionsFor(store, noteId))[0]?.reason).toBe("restore")
  })
})
