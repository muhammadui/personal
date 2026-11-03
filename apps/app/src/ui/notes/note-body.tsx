import Collaboration from "@tiptap/extension-collaboration"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState } from "react"
import type * as Y from "yjs"
import type { Store } from "../../data/store"
import { docPlainText } from "../../sync/note-docs"
import { firstLine } from "../format"
import { EditorToolbar } from "./editor-toolbar"
import { TaskItem, TaskList } from "./task-list-extension"

const SAVE_DELAY_MS = 800
const MAX_PLAIN_TEXT = 200_000

/** Tiptap bound to the note's Y.Doc. Writes the title and plain text back after a pause. */
export function NoteBody({ store, noteId, doc }: { store: Store; noteId: string; doc: Y.Doc }) {
  const [empty, setEmpty] = useState(true)
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
    const save = async () => {
      timer = undefined
      const text = docPlainText(doc)
      const title = firstLine(text)
      const plain = text.slice(0, MAX_PLAIN_TEXT)
      const note = await store.db.notes.get(noteId)
      if (!note || note.deleted_at) return
      if (note.title === title && (note.plain_text ?? "") === plain) return
      await store.update("notes", noteId, { title, plain_text: plain })
    }
    const flush = () => {
      if (timer === undefined) return
      window.clearTimeout(timer)
      void save().catch((e: unknown) => console.error("Could not save note title", e))
    }
    const onUpdate = (_update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => void save().catch((e: unknown) => console.error("Could not save note title", e)), SAVE_DELAY_MS)
    }
    doc.on("update", onUpdate)
    window.addEventListener("pagehide", flush)
    return () => {
      doc.off("update", onUpdate)
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [doc, store, noteId])

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
