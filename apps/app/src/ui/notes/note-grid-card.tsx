import { NoteCard, type NoteColour } from "@personal/ui"
import { Link } from "@tanstack/react-router"
import { Lock, Pin, Star } from "lucide-react"
import type { Stored } from "../../data/db"
import { editedLabel, firstLine, snippet } from "../format"

const COLOURS = new Set<NoteColour>(["lilac", "sand", "mint", "blue", "navy"])

/** A note as a `.note-card` (grids on desktop, pinned notes on phones). Locked notes are navy with no preview. */
export function NoteGridCard({ note, now, timeZone, compact = false, className }: { note: Stored<"notes">; now: Date; timeZone: string; compact?: boolean; className?: string }) {
  if (note.locked) {
    return (
      <NoteCard
        colour="navy"
        compact={compact}
        title={note.title || "Locked note"}
        preview={
          <span className="lock-lines" aria-hidden>
            <span className="lock-line" style={{ width: "90%" }} />
            <span className="lock-line" style={{ width: "66%" }} />
            <span className="lock-line" style={{ width: "78%" }} />
          </span>
        }
        meta="Locked · unlock with PIN"
        eyebrowIcon={<Lock size={16} strokeWidth={2} aria-hidden style={{ color: "var(--ink-on-brand)" }} />}
        render={({ className: cls, children }) => (
          <Link to="/notes/$noteId" params={{ noteId: note.id }} className={`${cls} ${className ?? ""}`} style={compact ? { minHeight: 0 } : undefined}>
            {children}
          </Link>
        )}
      />
    )
  }
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
