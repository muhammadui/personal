import { newId } from "@personal/core"
import * as Y from "yjs"
import type { Store } from "../data/store"
import { decryptBytes, encryptBytes, isEncrypted } from "./note-crypto"

const REMOTE = "remote"

export type OpenNoteDoc = { doc: Y.Doc; ready: Promise<void>; close: () => void }

/** Turn stored rows into plain Yjs updates; encrypted rows need the note key. */
async function plainUpdates(rows: { update: Uint8Array }[], key?: CryptoKey): Promise<Uint8Array[]> {
  const out: Uint8Array[] = []
  for (const r of rows) {
    if (!isEncrypted(r.update)) out.push(r.update)
    else if (key) out.push(await decryptBytes(key, r.update))
    else throw new Error("This note is locked")
  }
  return out
}

/**
 * One Yjs document per note (docs/sync.md). The device's log of updates lives in Dexie;
 * local edits are appended to the log and the doc outbox in one transaction.
 */
export function openNoteDoc(store: Store, noteId: string, key?: CryptoKey): OpenNoteDoc {
  const doc = new Y.Doc()
  const applied = new Set<string>()

  const loadNew = async () => {
    const rows = (await store.db.doc_updates.where("note_id").equals(noteId).sortBy("created_at")).filter((r) => !applied.has(r.id))
    const updates = await plainUpdates(rows, key)
    for (const r of rows) applied.add(r.id)
    Y.transact(
      doc,
      () => {
        for (const u of updates) Y.applyUpdate(doc, u, REMOTE)
      },
      REMOTE,
    )
  }

  const onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return
    // A locked note's edits are encrypted before they reach the log or the outbox.
    const save = key ? encryptBytes(key, update).then((enc) => store.writeDocUpdate(noteId, enc)) : store.writeDocUpdate(noteId, update)
    void save.catch((e: unknown) => console.error("Could not save note edit", e))
  }

  const ready = loadNew().then(() => {
    doc.on("update", onUpdate)
  })
  const unsubscribe = store.onRemoteDocs((ids) => {
    if (ids.includes(noteId)) void ready.then(loadNew)
  })

  return {
    doc,
    ready,
    close() {
      unsubscribe()
      doc.off("update", onUpdate)
      doc.destroy()
    },
  }
}

/** Plain text of a note body, for lists and search. */
export function docPlainText(doc: Y.Doc, field = "default"): string {
  const fragment = doc.getXmlFragment(field)
  const parts: string[] = []
  const walk = (node: Y.XmlElement | Y.XmlText | Y.XmlFragment) => {
    if (node instanceof Y.XmlText) {
      parts.push(node.toString().replace(/<[^>]+>/g, ""))
      return
    }
    node.toArray().forEach((child) => walk(child as Y.XmlElement | Y.XmlText))
    if (node instanceof Y.XmlElement && ["paragraph", "heading", "listItem", "taskItem", "codeBlock", "blockquote"].includes(node.nodeName)) {
      parts.push("\n")
    }
  }
  walk(fragment)
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim()
}

/**
 * Replace a note's log with one merged update and queue a snapshot that lets the server drop
 * everything it holds up to the device's cursor. Only runs when every local edit for the note
 * has already been pushed, so the snapshot covers all server updates up to that cursor.
 */
export async function compactNoteDoc(store: Store, noteId: string, minUpdates = 50): Promise<boolean> {
  const { db } = store
  return db.transaction("rw", [db.doc_updates, db.doc_outbox, db.sync_state], async () => {
    if ((await db.doc_outbox.where("note_id").equals(noteId).count()) > 0) return false
    const rows = await db.doc_updates.where("note_id").equals(noteId).toArray()
    if (rows.length < minUpdates) return false
    if (rows.some((r) => isEncrypted(r.update))) return false // locked notes are compacted by the lock helpers
    const merged = Y.mergeUpdates(rows.map((r) => r.update))
    const cursor = ((await db.sync_state.get("cursor"))?.value as number | undefined) ?? 0
    const id = newId()
    await db.doc_updates.bulkDelete(rows.map((r) => r.id))
    await db.doc_updates.add({ id, note_id: noteId, update: merged, synced: 0, created_at: Date.now() })
    await db.doc_outbox.add({ id, note_id: noteId, update: merged, compacts_up_to: cursor })
    return true
  })
}
