import * as Y from "yjs"
import type { OpenNoteDoc } from "../../sync/note-docs"

/** Put typed text into a new note as its first paragraph, through the note's Y.Doc. */
export async function insertFirstParagraph(handle: OpenNoteDoc, text: string): Promise<void> {
  try {
    await handle.ready
    const fragment = handle.doc.getXmlFragment("default")
    const paragraph = new Y.XmlElement("paragraph")
    paragraph.insert(0, [new Y.XmlText(text)])
    fragment.insert(0, [paragraph])
  } finally {
    handle.close()
  }
}
