import { SYNCED_TABLES } from "@personal/core"
import * as Y from "yjs"
import type { Store } from "./store"
import { isEncrypted } from "../sync/note-crypto"

/**
 * Export everything on this device (docs/security.md "Account controls"). Built entirely from
 * local data, so it works offline. One JSON file: every record plus each note body as
 * Markdown-ish plain text. Locked notes are exported as ciphertext markers, never decrypted.
 */
export type ExportFile = {
  app: "personal"
  version: 1
  exported_at: string
  records: Record<string, unknown[]>
  note_bodies: { note_id: string; title: string; text: string | null; locked: boolean }[]
}

function fragmentToText(doc: Y.Doc): string {
  const lines: string[] = []
  const walk = (node: Y.XmlElement | Y.XmlText | Y.XmlFragment, depth = 0) => {
    if (node instanceof Y.XmlText) return
    for (const child of node.toArray()) {
      if (child instanceof Y.XmlText) continue
      const el = child as Y.XmlElement
      const text = el
        .toArray()
        .filter((c): c is Y.XmlText => c instanceof Y.XmlText)
        .map((t) => t.toString().replace(/<[^>]+>/g, ""))
        .join("")
      const level = Number(el.getAttribute("level") ?? 1)
      if (el.nodeName === "heading") lines.push(`${"#".repeat(Math.min(6, Math.max(1, level)))} ${text}`)
      else if (el.nodeName === "paragraph") lines.push(depth > 0 ? text : text)
      else if (el.nodeName === "listItem") lines.push(`- ${text}`)
      else if (el.nodeName === "taskItem") lines.push(`- [${el.getAttribute("checked") ? "x" : " "}] ${text}`)
      else if (el.nodeName === "codeBlock") lines.push("```", text, "```")
      walk(el, depth + 1)
    }
  }
  walk(doc.getXmlFragment("default"))
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n")
}

export async function buildExport(store: Store): Promise<ExportFile> {
  const records: Record<string, unknown[]> = {}
  for (const table of SYNCED_TABLES) {
    records[table] = (await store.db.recordTable(table).toArray()).map(({ _hlc: _ignored, ...rest }) => rest)
  }
  const notes = await store.db.notes.toArray()
  const note_bodies: ExportFile["note_bodies"] = []
  for (const n of notes) {
    if (n.deleted_at) continue
    const rows = await store.db.doc_updates.where("note_id").equals(n.id).toArray()
    if (n.locked || rows.some((r) => isEncrypted(r.update))) {
      note_bodies.push({ note_id: n.id, title: n.title, text: null, locked: true })
      continue
    }
    const doc = new Y.Doc()
    for (const r of rows) Y.applyUpdate(doc, r.update)
    note_bodies.push({ note_id: n.id, title: n.title, text: fragmentToText(doc), locked: false })
  }
  return { app: "personal", version: 1, exported_at: new Date().toISOString(), records, note_bodies }
}

/** Trigger a browser download of the export. */
export async function downloadExport(store: Store): Promise<void> {
  const data = await buildExport(store)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `personal-export-${data.exported_at.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
