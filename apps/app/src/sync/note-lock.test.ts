import { base64ToBytes, newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import { addNote } from "../data/actions"
import { PersonalDb, deleteLocalData } from "../data/db"
import { Store } from "../data/store"
import { SyncEngine } from "./engine"
import { FakeSyncServer } from "./fake-server"
import { isEncrypted } from "./note-crypto"
import { openNoteDoc } from "./note-docs"
import { lockNote, removeLock, unlockNote, WrongPinError } from "./note-lock"
import { snapshotNote, versionPreview, versionsFor } from "./note-versions"

const cleanup: (() => Promise<void>)[] = []
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
const flush = () => new Promise((r) => setTimeout(r, 20))
const SECRET = "bank pin 4821"

function serverHasPlaintext(server: FakeSyncServer, text: string): boolean {
  const asText = (b64: string) => new TextDecoder("utf-8", { fatal: false }).decode(base64ToBytes(b64))
  return server.docs.some((d) => asText(d.update).includes(text)) || JSON.stringify([...server.records.values()]).includes(text)
}

describe("locked notes", () => {
  it("after locking, the server holds only ciphertext and another device needs the PIN", async () => {
    const server = new FakeSyncServer()
    const phone = device(server, "phone")
    const laptop = device(server, "laptop")
    const noteId = await addNote(phone.store)
    const open = openNoteDoc(phone.store, noteId)
    await open.ready
    open.doc.getText("t").insert(0, SECRET)
    await flush()
    await phone.store.update("notes", noteId, { plain_text: SECRET, title: "Bank" })
    await phone.engine.syncNow()
    expect(serverHasPlaintext(server, SECRET)).toBe(true)
    open.close()

    await lockNote(phone.store, (await phone.db.notes.get(noteId))!, "2580")
    await phone.engine.syncNow()
    expect(server.docs.filter((d) => d.noteId === noteId).every((d) => isEncrypted(base64ToBytes(d.update)))).toBe(true)
    expect(server.docs.some((d) => new TextDecoder().decode(base64ToBytes(d.update)).includes(SECRET))).toBe(false)
    const serverNote = server.records.get(`notes:${noteId}`)!.state.data
    expect(serverNote).toMatchObject({ locked: true, plain_text: "" })

    // Another device: wrong PIN refused, right PIN opens the content.
    await laptop.engine.syncNow()
    const note = (await laptop.db.notes.get(noteId))!
    await expect(unlockNote(note, "0000")).rejects.toBeInstanceOf(WrongPinError)
    const key = await unlockNote(note, "2580")
    const remote = openNoteDoc(laptop.store, noteId, key)
    await remote.ready
    expect(remote.doc.getText("t").toString()).toBe(SECRET)

    // Edits while locked are encrypted before they leave the device.
    remote.doc.getText("t").insert(0, "Updated: ")
    await flush()
    const pending = await laptop.db.doc_outbox.toArray()
    expect(pending.every((p) => isEncrypted(p.update))).toBe(true)
    await laptop.engine.syncNow()
    expect(serverHasPlaintext(server, "Updated")).toBe(false)
    remote.close()
  }, 30_000)

  it("locking blanks and trashes earlier plaintext version snapshots, on the server too", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "versions")
    const noteId = await addNote(d.store)
    await d.store.create("note_versions", { note_id: noteId, snapshot: btoa(SECRET), reason: "hourly" })
    await d.engine.syncNow()
    await lockNote(d.store, (await d.db.notes.get(noteId))!, "2580")
    await d.engine.syncNow()
    const local = await d.db.note_versions.where("note_id").equals(noteId).toArray()
    expect(local.every((v) => v.snapshot === "" && v.deleted_at)).toBe(true)
    expect(JSON.stringify([...server.records.values()])).not.toContain(btoa(SECRET))
  }, 30_000)

  it("removing the lock restores a normal note", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "solo")
    const noteId = await addNote(d.store)
    const open = openNoteDoc(d.store, noteId)
    await open.ready
    open.doc.getText("t").insert(0, "hello")
    await flush()
    open.close()
    const key = await lockNote(d.store, (await d.db.notes.get(noteId))!, "1234")
    await removeLock(d.store, (await d.db.notes.get(noteId))!, key)
    await d.engine.syncNow()
    expect((await d.db.notes.get(noteId))?.locked).toBe(false)
    const again = openNoteDoc(d.store, noteId)
    await again.ready
    expect(again.doc.getText("t").toString()).toBe("hello")
    expect(server.docs.filter((x) => x.noteId === noteId).every((x) => !isEncrypted(base64ToBytes(x.update)))).toBe(true)
    again.close()
  }, 30_000)

  it("while locking, no screen ever sees a blank version (regression: 'Unexpected end of array')", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "solo")
    const noteId = await addNote(d.store)
    const open = openNoteDoc(d.store, noteId)
    await open.ready
    open.doc.getText("t").insert(0, "draft")
    await flush()
    await snapshotNote(d.store, noteId, open.doc, "manual")
    open.close()
    // What the version-history panel reads, checked after every single local write.
    const seen: string[][] = []
    d.db.note_versions.hook("updating", () => {
      queueMicrotask(() => void versionsFor(d.store, noteId).then((vs) => seen.push(vs.map((v) => v.snapshot))))
    })
    await lockNote(d.store, (await d.db.notes.get(noteId))!, "12345678")
    await flush()
    for (const snapshots of seen) expect(snapshots).not.toContain("")
    expect(await versionsFor(d.store, noteId)).toEqual([])
    // A blank snapshot (from another device) is shown as empty, never decoded.
    expect(versionPreview({ ...(await d.db.note_versions.where("note_id").equals(noteId).first())!, snapshot: "" })).toBe("")
  }, 30_000)

  it("accepts PINs of 4 to 8 digits and refuses others", async () => {
    const server = new FakeSyncServer()
    const d = device(server, "solo")
    const a = await addNote(d.store)
    await expect(lockNote(d.store, (await d.db.notes.get(a))!, "123")).rejects.toThrow()
    await expect(lockNote(d.store, (await d.db.notes.get(a))!, "123456789")).rejects.toThrow()
    await lockNote(d.store, (await d.db.notes.get(a))!, "87654321")
    await expect(unlockNote((await d.db.notes.get(a))!, "8765432")).rejects.toBeInstanceOf(WrongPinError)
    await expect(unlockNote((await d.db.notes.get(a))!, "87654321")).resolves.toBeDefined()
  }, 30_000)
})
