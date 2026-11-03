import { NoteCard, type NoteColour } from "@personal/ui"
import { Link } from "@tanstack/react-router"
import { Pin, Star } from "lucide-react"
import type { Stored } from "../../data/db"
import { editedLabel, firstLine, snippet } from "../format"

const COLOURS = new Set<NoteColour>(["lilac", "sand", "mint", "blue", "navy"])

/** A note as a `.note-card` (grids on desktop, pinned notes on phones). */
export function NoteGridCard({ note, now, timeZone, compact = false, className }: { note: Stored<"notes">; now: Date; timeZone: string; compact?: boolean; className?: string }) {
  const colour: NoteColour = note.colour && COLOURS.has(note.colour as NoteColour) ? (note.colour as NoteColour) : note.pinned ? "lilac" : "plain"
  return (
    <NoteCard
      colour={colour}
      compact={compact}
      title={note.title || firstLine(note.plain_text ?? "") || "Untitled"}
      preview={snippet(note.plain_text ?? "", 220) || undefined}
      meta={editedLabel(note.updated_at, now, timeZone)}
      eyebrowIcon={note.pinned ? <Pin size={16} strokeWidth={2} aria-hidden style={{ color: "var(--text-accent)" }} /> : note.favourite ? <Star size={16} strokeWidth={2} aria-hidden /> : undefined}
      render={({ className: cls, children }) => (
        <Link to="/notes/$noteId" params={{ noteId: note.id }} className={`${cls} ${className ?? ""}`} style={compact ? { minHeight: 0 } : undefined}>
          {children}
        </Link>
      )}
    />
  )
}
