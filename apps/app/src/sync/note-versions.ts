import { base64ToBytes, bytesToBase64 } from "@personal/core"
import * as Y from "yjs"
import type { Stored } from "../data/db"
import type { Store } from "../data/store"

/**
 * Note version history (docs/product.md "Autosave + version history"): a snapshot at most
 * once an hour while a note is edited, one before every restore. Snapshots are synced
 * `note_versions` records. Locked notes keep no snapshots (they would be plaintext).
 */
export const SNAPSHOT_EVERY_MS = 60 * 60 * 1000
const MAX_SNAPSHOT_BYTES = 3_500_000 // base64 must stay under the 5 MB schema limit

export async function versionsFor(store: Store, noteId: string): Promise<Stored<"note_versions">[]> {
  const all = await store.db.note_versions.where("note_id").equals(noteId).toArray()
  // A blank snapshot is a version emptied by locking the note; it has nothing to show.
  return all.filter((v) => !v.deleted_at && v.snapshot !== "").sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function snapshotNote(store: Store, noteId: string, doc: Y.Doc, reason: "hourly" | "restore" | "manual"): Promise<string | null> {
  const note = await store.db.notes.get(noteId)
  if (!note || note.locked) return null
  const state = Y.encodeStateAsUpdate(doc)
  if (state.length > MAX_SNAPSHOT_BYTES) return null
  return store.create("note_versions", { note_id: noteId, snapshot: bytesToBase64(state), reason })
}

/** Call after edits: takes an hourly snapshot when the last one is older than an hour. */
export async function maybeHourlySnapshot(store: Store, noteId: string, doc: Y.Doc, now = Date.now()): Promise<boolean> {
  const [latest] = await versionsFor(store, noteId)
  if (latest && now - Date.parse(latest.created_at) < SNAPSHOT_EVERY_MS) return false
  return (await snapshotNote(store, noteId, doc, "hourly")) !== null
}

/**
 * Restore an older version into the live document. The current state is saved first, then the
 * body is replaced inside one Yjs transaction, so the restore itself syncs like any other edit.
 */
export async function restoreVersion(store: Store, noteId: string, doc: Y.Doc, version: Stored<"note_versions">, field = "default"): Promise<void> {
  await snapshotNote(store, noteId, doc, "restore")
  const old = versionDoc(version)
  if (!old) throw new Error("This version is empty")
  const source = old.getXmlFragment(field)
  const target = doc.getXmlFragment(field)
  doc.transact(() => {
    target.delete(0, target.length)
    target.insert(0, source.toArray().map((n) => (n as Y.XmlElement | Y.XmlText).clone()))
  })
}

/** The version's document, or null for a blank snapshot (emptied when the note was locked). */
export function versionDoc(version: Stored<"note_versions">): Y.Doc | null {
  if (version.snapshot === "") return null
  const d = new Y.Doc()
  Y.applyUpdate(d, base64ToBytes(version.snapshot))
  return d
}

export function versionPreview(version: Stored<"note_versions">): string {
  const d = versionDoc(version)
  if (!d) return ""
  return d.getXmlFragment("default").toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
}
