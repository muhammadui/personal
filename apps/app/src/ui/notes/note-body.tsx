import Collaboration from "@tiptap/extension-collaboration"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useRef, useState } from "react"
import type * as Y from "yjs"
import type { Store } from "../../data/store"
import { docPlainText } from "../../sync/note-docs"
import { maybeHourlySnapshot } from "../../sync/note-versions"
import { firstLine } from "../format"
import { EditorToolbar } from "./editor-toolbar"
import { TaskItem, TaskList } from "./task-list-extension"

const SAVE_DELAY_MS = 800
/** Version history: try an hourly snapshot this long after typing stops. */
const SNAPSHOT_DELAY_MS = 5000
const MAX_PLAIN_TEXT = 200_000

/** What the note screen needs from the open editor: export, restore, and saving before a lock change. */
export type NoteApi = { doc: Y.Doc; editor: Editor; flush: () => Promise<void> }

type Props = { store: Store; noteId: string; doc: Y.Doc; onReady?: ((api: NoteApi | null) => void) | undefined }

/**
 * Tiptap bound to the note's Y.Doc. Writes the title and plain text back after a pause.
 * Locked notes never get plain text written (it would be stored and synced unencrypted).
 */
export function NoteBody({ store, noteId, doc, onReady }: Props) {
  const [empty, setEmpty] = useState(true)
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const editor = useEditor(
    {
      extensions: [StarterKit.configure({ undoRedo: false }), TaskList, TaskItem, Collaboration.configure({ document: doc, field: "default" })],
      editorProps: { attributes: { class: "note-prose", "aria-label": "Note", spellcheck: "true" } },
      onCreate: ({ editor: e }) => setEmpty(e.isEmpty),
      onUpdate: ({ editor: e }) => setEmpty(e.isEmpty),
    },
    [doc],
  )

  useEffect(() => {
    let timer: number | undefined
    let snapTimer: number | undefined
    const save = async () => {
      timer = undefined
      const text = docPlainText(doc)
      const title = firstLine(text)
      const note = await store.db.notes.get(noteId)
      if (!note || note.deleted_at) return
      const plain = note.locked ? "" : text.slice(0, MAX_PLAIN_TEXT)
      if (note.title === title && (note.plain_text ?? "") === plain) return
      await store.update("notes", noteId, { title, plain_text: plain })
    }
    const snapshot = () => {
      snapTimer = undefined
      void maybeHourlySnapshot(store, noteId, doc).catch((e: unknown) => console.error("Could not save a version", e))
    }
    const flush = async () => {
      if (timer === undefined) return
      window.clearTimeout(timer)
      await save().catch((e: unknown) => console.error("Could not save note title", e))
    }
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => void save().catch((e: unknown) => console.error("Could not save note title", e)), SAVE_DELAY_MS)
      if (snapTimer !== undefined) window.clearTimeout(snapTimer)
      snapTimer = window.setTimeout(snapshot, SNAPSHOT_DELAY_MS)
    }
    const onHide = () => void flush()
    doc.on("update", onUpdate)
    window.addEventListener("pagehide", onHide)
    flushRef.current = flush
    return () => {
      doc.off("update", onUpdate)
      window.removeEventListener("pagehide", onHide)
      if (snapTimer !== undefined) window.clearTimeout(snapTimer)
      void flush()
    }
  }, [doc, store, noteId])

  useEffect(() => {
    if (!editor || !onReady) return
    onReady({ doc, editor, flush: () => flushRef.current() })
    return () => onReady(null)
  }, [editor, doc, onReady])

  if (!editor) return null
  return (
    <div className="flex flex-col gap-3">
      <EditorToolbar editor={editor} />
      <div className="note-body relative">
        {empty ? (
          <p className="pointer-events-none absolute top-0 left-0 m-0 text-title-1" style={{ color: "var(--ink-faint)" }}>
            Untitled
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
