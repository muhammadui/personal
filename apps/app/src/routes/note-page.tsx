import { Button, Card, Dialog, EmptyState, IconButton, SectionLabel, Sheet, SyncStatus } from "@personal/ui"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Bell, ChevronLeft, FileText, MoreHorizontal, Pin, PinOff, Star, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { cancelReminder, setReminder } from "../data/actions"
import type { Stored } from "../data/db"
import { activeReminderFor } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { dueLabel, editedLabel } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { NoteEditor } from "../ui/notes/note-editor"
import { DueSheet } from "../ui/reminders/due-sheet"
import { emitUi } from "../ui/shell/events"
import { useToast } from "../ui/shell/toast-provider"
import { useSyncLabel } from "../ui/shell/use-sync-label"

/** PhoneEditor / Editor. */
export function NotePage() {
  const { noteId } = useParams({ from: "/notes/$noteId" })
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const sync = useSyncLabel()
  const { showToast } = useToast()
  const [menu, setMenu] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const note = useLiveQuery<Stored<"notes"> | null | undefined>(async () => (await store.db.notes.get(noteId)) ?? null, [store, noteId], undefined)
  const reminder = useLiveQuery(() => activeReminderFor(store.db, noteId), [store, noteId], undefined)

  useEffect(() => {
    if (note && !note.deleted_at) void store.update("notes", note.id, { last_opened_at: new Date().toISOString() })
    // Only when a note is opened, not on every change to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, note?.id])

  if (note === undefined) return null
  if (note === null || note.deleted_at) {
    return (
      <EmptyState icon={<FileText size={24} strokeWidth={2} aria-hidden />} title="This note was deleted">
        Restore it from Trash if you need it back.
      </EmptyState>
    )
  }

  const remove = async () => {
    setConfirming(false)
    if (reminder) await cancelReminder(store, reminder.id)
    await store.remove("notes", note.id)
    showToast({ message: "Moved to Trash", actionLabel: "Undo", onAction: () => void store.restore("notes", note.id) })
    void navigate({ to: "/notes" })
  }

  const saved = sync.state === "off" ? <SyncStatus pill state="off" label={sync.pending ? `Offline · ${sync.pending} saved on this device` : "Saved on this device"} /> : <SyncStatus state="ok" label="Saved" />

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-10">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="-mx-3 flex items-center gap-1 md:mx-0 md:gap-2.5">
          <button type="button" className="btn btn-ghost" style={{ padding: "0 8px", gap: 2, color: "var(--text-accent)" }} onClick={() => void navigate({ to: "/notes" })}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
            Notes
          </button>
          <span className="flex-1" />
          <span className="mr-1">{saved}</span>
          <IconButton plain large label={note.pinned ? "Unpin" : "Pin"} onClick={() => void store.update("notes", note.id, { pinned: !note.pinned })} style={note.pinned ? { color: "var(--text-accent)" } : undefined}>
            {note.pinned ? <Pin size={20} strokeWidth={2} aria-hidden /> : <PinOff size={20} strokeWidth={2} aria-hidden />}
          </IconButton>
          <IconButton plain large label="Reminder" className="md:hidden" onClick={() => setReminding(true)} style={reminder ? { color: "var(--text-accent)" } : undefined}>
            <Bell size={20} strokeWidth={2} aria-hidden />
          </IconButton>
          <IconButton plain large label="More" onClick={() => setMenu(true)}>
            <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
          </IconButton>
          <Button variant="primary" className="hidden md:inline-flex" onClick={() => setReminding(true)}>
            <Bell size={16} strokeWidth={2} aria-hidden />
            Remind me
          </Button>
        </header>
        <span className="t-meta">{editedLabel(note.updated_at, now, timeZone)}</span>
        <NoteEditor noteId={note.id} />
      </div>

      <aside aria-label="Note details" className="hidden w-[280px] shrink-0 flex-col gap-6 pt-16 md:flex">
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Reminder</SectionLabel>
          {reminder ? (
            <Card className="flex items-center gap-3 p-3.5">
              <span className="tile tile-accent">
                <Bell size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="t-body-strong" style={{ fontSize: 14 }}>
                  {dueLabel(reminder.fire_at, true, now, timeZone)}
                </span>
                <span className="t-meta" style={{ fontSize: 12 }}>
                  Fires on every device, even offline
                </span>
              </span>
            </Card>
          ) : (
            <p className="t-meta">No reminder.</p>
          )}
        </section>
      </aside>

      <DueSheet
        key={reminder?.id ?? "none"}
        open={reminding}
        onClose={() => setReminding(false)}
        timeZone={timeZone}
        mode="reminder"
        initial={{ dueAt: reminder?.fire_at ?? null, hasTime: true, reminder: "at" }}
        onSave={(v) => {
          const title = note.title || "Note"
          if (v.dueAt) {
            void setReminder(store, { type: "note", id: note.id, title }, v.dueAt, timeZone)
            emitUi({ type: "notify-prompt", title, fireAt: v.dueAt })
          } else if (reminder) void cancelReminder(store, reminder.id)
        }}
      />
      <Sheet open={menu} onClose={() => setMenu(false)} label="Note actions">
        <h2 className="t-title3">{note.title || "Untitled"}</h2>
        <div className="list">
          <button
            type="button"
            className="task row-btn"
            style={{ minHeight: 52 }}
            onClick={() => {
              void store.update("notes", note.id, { favourite: !note.favourite })
              setMenu(false)
            }}
          >
            <Star size={20} strokeWidth={2} aria-hidden style={{ color: "var(--ink-muted)" }} />
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              {note.favourite ? "Remove from favourites" : "Add to favourites"}
            </span>
          </button>
          <button
            type="button"
            className="task row-btn"
            style={{ minHeight: 52, color: "var(--danger)" }}
            onClick={() => {
              setMenu(false)
              setConfirming(true)
            }}
          >
            <Trash2 size={20} strokeWidth={2} aria-hidden />
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Delete note
            </span>
          </button>
        </div>
      </Sheet>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this note?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              Delete note
            </Button>
          </>
        }
      >
        It moves to Trash. You can restore it for 30 days.
      </Dialog>
    </div>
  )
}
