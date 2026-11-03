import { Link } from "@tanstack/react-router"
import { FileText, Pin } from "lucide-react"
import type { Stored } from "../../data/db"
import { firstLine, relativeTime, snippet } from "../format"

/** A note in the Recent list on phones (PhoneNotes.dc.html). */
export function NoteListRow({ note, now, timeZone, className }: { note: Stored<"notes">; now: Date; timeZone: string; className?: string }) {
  const title = note.title || firstLine(note.plain_text ?? "") || "Untitled"
  const preview = snippet(note.plain_text ?? "") || "No text yet"
  return (
    <Link to="/notes/$noteId" params={{ noteId: note.id }} className={`task ${className ?? ""}`} style={{ textDecoration: "none", color: "inherit" }}>
      <span className="tile">{note.pinned ? <Pin size={18} strokeWidth={2} aria-hidden /> : <FileText size={18} strokeWidth={2} aria-hidden />}</span>
      <span className="task-body">
        <span className="t-body-strong truncate">{title}</span>
        <span className="t-meta truncate" style={{ fontSize: 12 }}>
          {preview}
        </span>
      </span>
      <span className="t-meta whitespace-nowrap" style={{ fontSize: 12 }}>
        {relativeTime(note.updated_at, now, timeZone)}
      </span>
    </Link>
  )
}
