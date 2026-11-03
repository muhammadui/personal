import { useEffect, useState } from "react"
import type * as Y from "yjs"
import { useStore } from "../../data/session"
import { openNoteDoc } from "../../sync/note-docs"
import { NoteBody, type NoteApi } from "./note-body"

type Props = {
  noteId: string
  /** The note key, for a locked note that has been unlocked. */
  cryptoKey?: CryptoKey | undefined
  onReady?: ((api: NoteApi | null) => void) | undefined
}

/** Opens the note's Y.Doc from local storage (decrypting with the key if locked), then mounts the editor on it. */
export function NoteEditor({ noteId, cryptoKey, onReady }: Props) {
  const store = useStore()
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const handle = openNoteDoc(store, noteId, cryptoKey)
    let live = true
    setFailed(false)
    handle.ready.then(
      () => {
        if (live) setDoc(handle.doc)
      },
      (e: unknown) => {
        console.error("Could not open note", e)
        if (live) setFailed(true)
      },
    )
    return () => {
      live = false
      setDoc(null)
      handle.close()
    }
  }, [store, noteId, cryptoKey])

  if (failed) return <p className="pt-6 text-base text-faint">This note couldn't be opened on this device.</p>
  if (!doc) return <p className="pt-6 text-base text-faint">Loading…</p>
  return <NoteBody key={doc.guid} store={store} noteId={noteId} doc={doc} onReady={onReady} />
}
