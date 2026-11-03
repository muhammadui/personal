import { Button, Sheet } from "@personal/ui"
import { Copy, FileCode, FileText, History, Lock, LockOpen, Star, Trash2 } from "lucide-react"
import type { ReactNode } from "react"
import type { Stored } from "../../data/db"
import { editedLabel } from "../format"
import { useToast } from "../shell/toast-provider"
import type { NoteApi } from "./note-body"
import { docToMarkdown, docToText, markdownFileName, wordCount, type PmNode } from "./note-markdown"

type Props = {
  open: boolean
  onClose: () => void
  note: Stored<"notes">
  api: NoteApi | null
  now: Date
  timeZone: string
  onHistory: () => void
  onLock: () => void
  onRemoveLock: () => void
  onDelete: () => void
  onToggleFavourite: () => void
}

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Row({ icon, label, detail, danger = false, onClick }: { icon: ReactNode; label: string; detail: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="task row-btn" style={{ minHeight: 56, color: danger ? "var(--danger)" : "var(--ink)" }} onClick={onClick}>
      <span className="flex" style={{ color: danger ? undefined : "var(--ink-muted)" }}>
        {icon}
      </span>
      <span className="task-body">
        <span className="t-body-strong" style={{ fontWeight: 600, color: "inherit" }}>
          {label}
        </span>
        <span className="t-meta" style={{ fontSize: 12 }}>
          {detail}
        </span>
      </span>
    </button>
  )
}

const ICON = { size: 20, strokeWidth: 2, "aria-hidden": true } as const

/** PhoneExport: the note's More menu. Export, copy, history, lock and delete. */
export function NoteActionsSheet({ open, onClose, note, api, now, timeZone, onHistory, onLock, onRemoveLock, onDelete, onToggleFavourite }: Props) {
  const { showToast } = useToast()
  const title = note.title || "Untitled"
  const json = (): PmNode | null => (api ? (api.editor.getJSON() as PmNode) : null)
  const words = api ? wordCount(api.editor.getText()) : 0

  const copy = async () => {
    const doc = json()
    if (!doc) return
    try {
      await navigator.clipboard.writeText(docToText(doc))
      showToast({ message: "Copied as text" })
    } catch (e) {
      console.error("Copy failed", e)
      showToast({ message: "Couldn't copy. Select the text and copy it instead." })
    }
    onClose()
  }

  const exportAs = (kind: "markdown" | "text") => {
    const doc = json()
    if (!doc) return
    if (kind === "markdown") download(markdownFileName(title), "text/markdown;charset=utf-8", docToMarkdown(doc))
    else download(markdownFileName(title).replace(/\.md$/, ".txt"), "text/plain;charset=utf-8", docToText(doc) + "\n")
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} label="Note actions">
      <div className="flex flex-col gap-0.5">
        <h2 className="t-title3">{title}</h2>
        <span className="t-meta">
          {words} {words === 1 ? "word" : "words"} · {editedLabel(note.updated_at, now, timeZone).replace(/^Edited/, "edited")}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="t-label">Export as</span>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="chip" style={{ height: 72, flexDirection: "column", justifyContent: "center", gap: 6 }} disabled={!api} onClick={() => exportAs("markdown")}>
            <FileCode {...ICON} />
            Markdown
          </button>
          <button type="button" className="chip" style={{ height: 72, flexDirection: "column", justifyContent: "center", gap: 6 }} disabled={!api} onClick={() => exportAs("text")}>
            <FileText {...ICON} />
            Plain text
          </button>
        </div>
      </div>
      <div className="list">
        <Row icon={<Copy {...ICON} />} label="Copy as text" detail="Paste into WhatsApp, email or anywhere" onClick={() => void copy()} />
        {note.locked ? null : <Row icon={<History {...ICON} />} label="Version history" detail="See and restore earlier versions" onClick={onHistory} />}
        <Row
          icon={<Star {...ICON} />}
          label={note.favourite ? "Remove from favourites" : "Add to favourites"}
          detail={note.favourite ? "It stays in your notes" : "Find it faster later"}
          onClick={onToggleFavourite}
        />
        {note.locked ? (
          <Row icon={<LockOpen {...ICON} />} label="Remove lock" detail="Anyone using this device can read it" onClick={onRemoveLock} />
        ) : (
          <Row icon={<Lock {...ICON} />} label="Lock this note" detail="Hide it behind your PIN" onClick={onLock} />
        )}
        <Row icon={<Trash2 {...ICON} />} label="Move to Trash" detail="Restore it within 30 days" danger onClick={onDelete} />
      </div>
      <Button size="xl" block onClick={onClose}>
        Close
      </Button>
    </Sheet>
  )
}
