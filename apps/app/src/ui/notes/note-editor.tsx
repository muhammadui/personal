import { useEffect, useState } from "react"
import type * as Y from "yjs"
import { useStore } from "../../data/session"
import { openNoteDoc } from "../../sync/note-docs"
import { NoteBody } from "./note-body"

/** Opens the note's Y.Doc from local storage, then mounts the editor on it. */
export function NoteEditor({ noteId }: { noteId: string }) {
  const store = useStore()
  const [doc, setDoc] = useState<Y.Doc | null>(null)

  useEffect(() => {
    const handle = openNoteDoc(store, noteId)
    let live = true
    void handle.ready.then(() => {
      if (live) setDoc(handle.doc)
    })
    return () => {
      live = false
      setDoc(null)
      handle.close()
    }
  }, [store, noteId])

  if (!doc) return <p className="pt-6 text-base text-faint">Loading…</p>
  return <NoteBody key={doc.guid} store={store} noteId={noteId} doc={doc} />
}
