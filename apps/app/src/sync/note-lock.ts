import { newId } from "@personal/core"
import * as Y from "yjs"
import type { Stored } from "../data/db"
import type { Store } from "../data/store"
import { decryptBytes, deriveNoteKey, encryptBytes, isEncrypted, makeLockCheck, newSalt, verifyLockCheck, WrongPinError } from "./note-crypto"
import { docPlainText } from "./note-docs"

export { WrongPinError }
export const MIN_PIN_LENGTH = 4
export const MAX_PIN_LENGTH = 8

/** Keys of notes unlocked in this session. Forgotten when the app is hidden or reloaded. */
const unlocked = new Map<string, CryptoKey>()
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") unlocked.clear()
  })
}
export const unlockedKey = (noteId: string) => unlocked.get(noteId)
export const forgetUnlockedKeys = () => unlocked.clear()

async function readState(store: Store, noteId: string, key?: CryptoKey): Promise<Uint8Array> {
  const rows = await store.db.doc_updates.where("note_id").equals(noteId).toArray()
  const plain: Uint8Array[] = []
  for (const r of rows) {
    if (!isEncrypted(r.update)) plain.push(r.update)
    else if (key) plain.push(await decryptBytes(key, r.update))
    else throw new WrongPinError("This note is locked")
  }
  return plain.length > 0 ? Y.mergeUpdates(plain) : Y.encodeStateAsUpdate(new Y.Doc())
}

/**
 * Replace every stored update of the note with one snapshot, locally and on the server.
 * The snapshot compacts ALL server updates for the note, so no plaintext stays on the server
 * after locking. (A concurrent unsynced edit from another device to the same note at that
 * moment can be lost; it is a rare case and preferable to leaving plaintext behind.)
 */
async function replaceWithSnapshot(store: Store, noteId: string, snapshot: Uint8Array): Promise<void> {
  const { db } = store
  const id = newId()
  await db.transaction("rw", [db.doc_updates, db.doc_outbox], async () => {
    await db.doc_updates.where("note_id").equals(noteId).delete()
    await db.doc_outbox.where("note_id").equals(noteId).delete()
    await db.doc_updates.add({ id, note_id: noteId, update: snapshot, synced: 0, created_at: Date.now() })
    await db.doc_outbox.add({ id, note_id: noteId, update: snapshot, compacts_up_to: Number.MAX_SAFE_INTEGER })
  })
}

export async function lockNote(store: Store, note: Stored<"notes">, pin: string): Promise<CryptoKey> {
  if (note.locked) throw new Error("Note is already locked")
  if (pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) throw new Error(`Use ${MIN_PIN_LENGTH} to ${MAX_PIN_LENGTH} digits`)
  const salt = newSalt()
  const key = await deriveNoteKey(pin, salt)
  const state = await readState(store, note.id)
  await replaceWithSnapshot(store, note.id, await encryptBytes(key, state))
  await store.update("notes", note.id, { locked: true, lock_salt: salt, lock_check: await makeLockCheck(key), plain_text: "" })
  // Earlier version-history snapshots are plaintext: blank them (an ordinary synced field
  // write, so the server copy is overwritten too) and move them to Trash.
  const versions = await store.db.note_versions.where("note_id").equals(note.id).toArray()
  const nowIso = new Date().toISOString()
  for (const v of versions) {
    if (v.snapshot === "" && v.deleted_at) continue
    await store.update("note_versions", v.id, { snapshot: "", ...(v.deleted_at ? {} : { deleted_at: nowIso }) })
  }
  unlocked.set(note.id, key)
  return key
}

/** Check the PIN and keep the key for this session. Throws WrongPinError. */
export async function unlockNote(note: Stored<"notes">, pin: string): Promise<CryptoKey> {
  if (!note.locked || !note.lock_salt || !note.lock_check) throw new Error("Note is not locked")
  const key = await deriveNoteKey(pin, note.lock_salt)
  if (!(await verifyLockCheck(key, note.lock_check))) throw new WrongPinError("Wrong PIN")
  unlocked.set(note.id, key)
  return key
}

export async function removeLock(store: Store, note: Stored<"notes">, key: CryptoKey): Promise<void> {
  const state = await readState(store, note.id, key)
  await replaceWithSnapshot(store, note.id, state)
  const doc = new Y.Doc()
  Y.applyUpdate(doc, state)
  await store.update("notes", note.id, { locked: false, lock_salt: null, lock_check: null, plain_text: docPlainText(doc).slice(0, 200_000) })
  unlocked.delete(note.id)
}
