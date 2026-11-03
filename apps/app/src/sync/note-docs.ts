import { newId } from "@personal/core"
import * as Y from "yjs"
import type { Store } from "../data/store"

const REMOTE = "remote"

export type OpenNoteDoc = { doc: Y.Doc; ready: Promise<void>; close: () => void }

/**
 * One Yjs document per note (docs/sync.md). The device's log of updates lives in Dexie;
 * local edits are appended to the log and the doc outbox in one transaction.
 */
export function openNoteDoc(store: Store, noteId: string): OpenNoteDoc {
  const doc = new Y.Doc()
  const applied = new Set<string>()

  const loadNew = async () => {
    const rows = await store.db.doc_updates.where("note_id").equals(noteId).sortBy("created_at")
    Y.transact(
      doc,
      () => {
        for (const r of rows) {
          if (applied.has(r.id)) continue
          applied.add(r.id)
          Y.applyUpdate(doc, r.update, REMOTE)
        }
      },
      REMOTE,
    )
  }

  const onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return
    void store.writeDocUpdate(noteId, update).catch((e: unknown) => console.error("Could not save note edit", e))
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
    const merged = Y.mergeUpdates(rows.map((r) => r.update))
    const cursor = ((await db.sync_state.get("cursor"))?.value as number | undefined) ?? 0
    const id = newId()
    await db.doc_updates.bulkDelete(rows.map((r) => r.id))
    await db.doc_updates.add({ id, note_id: noteId, update: merged, synced: 0, created_at: Date.now() })
    await db.doc_outbox.add({ id, note_id: noteId, update: merged, compacts_up_to: cursor })
    return true
  })
}
