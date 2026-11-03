import { Button, Card, Dialog, EmptyState, IconButton, SectionLabel, SyncStatus } from "@personal/ui"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Bell, ChevronLeft, FileText, Lock, MoreHorizontal, Pin, PinOff } from "lucide-react"
import { useEffect, useState } from "react"
import { cancelReminder, setReminder } from "../data/actions"
import type { Stored } from "../data/db"
import { activeReminderFor } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { lockNote, removeLock, unlockedKey } from "../sync/note-lock"
import { dueLabel, editedLabel } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { LockSheet } from "../ui/notes/lock-sheet"
import { LockedNote } from "../ui/notes/locked-note"
import type { NoteApi } from "../ui/notes/note-body"
import { NoteActionsSheet } from "../ui/notes/note-actions-sheet"
import { NoteEditor } from "../ui/notes/note-editor"
import { VersionHistory } from "../ui/notes/version-history"
import { DueSheet } from "../ui/reminders/due-sheet"
import { emitUi } from "../ui/shell/events"
import { useToast } from "../ui/shell/toast-provider"
import { useSyncLabel } from "../ui/shell/use-sync-label"

/** Let React unmount the editor (and its Y.Doc handle) before the stored updates are rewritten. */
const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** PhoneEditor / Editor, with PhoneLocked in front of locked notes. */
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
  const [locking, setLocking] = useState(false)
  const [unlockConfirm, setUnlockConfirm] = useState(false)
  const [history, setHistory] = useState(false)
  const [api, setApi] = useState<NoteApi | null>(null)
  /** The note key while a locked note is open. Forgotten when the app is hidden. */
  const [key, setKey] = useState<CryptoKey | undefined>(() => unlockedKey(noteId))
  /** True while the lock is being added or removed; the editor is unmounted meanwhile. */
  const [changingLock, setChangingLock] = useState(false)
  const note = useLiveQuery<Stored<"notes"> | null | undefined>(async () => (await store.db.notes.get(noteId)) ?? null, [store, noteId], undefined)
  const reminder = useLiveQuery(() => activeReminderFor(store.db, noteId), [store, noteId], undefined)

  useEffect(() => {
    if (note && !note.deleted_at) void store.update("notes", note.id, { last_opened_at: new Date().toISOString() })
    // Only when a note is opened, not on every change to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, note?.id])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setKey(undefined)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  if (note === undefined) return null
  if (note === null || note.deleted_at) {
    return (
      <EmptyState icon={<FileText size={24} strokeWidth={2} aria-hidden />} title="This note was deleted">
        Restore it from Trash if you need it back.
      </EmptyState>
    )
  }

  if (note.locked && !key && !changingLock) return <LockedNote note={note} onUnlock={setKey} />

  const lock = async (pin: string) => {
    await api?.flush()
    setChangingLock(true)
    await nextTick()
    try {
      const fresh = await store.db.notes.get(note.id)
      if (!fresh) throw new Error("Note not found")
      const k = await lockNote(store, fresh, pin)
      // Older versions are plaintext snapshots; a locked note keeps none.
      setKey(k)
      setLocking(false)
      showToast({ message: "Note locked" })
    } finally {
      setChangingLock(false)
    }
  }

  const unlockForGood = async () => {
    if (!key) return
    setUnlockConfirm(false)
    await api?.flush()
    setChangingLock(true)
    await nextTick()
    try {
      const fresh = await store.db.notes.get(note.id)
      if (!fresh) throw new Error("Note not found")
      await removeLock(store, fresh, key)
      setKey(undefined)
      showToast({ message: "Lock removed" })
    } catch (e) {
      console.error("Could not remove lock", e)
      showToast({ message: "Couldn't remove the lock. Try again." })
    } finally {
      setChangingLock(false)
    }
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
          {note.locked ? (
            <span className="flex px-1" style={{ color: "var(--ink-muted)" }} title="Locked note" aria-label="Locked note" role="img">
              <Lock size={18} strokeWidth={2} aria-hidden />
            </span>
          ) : null}
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
        {changingLock ? <p className="pt-6 text-base text-faint">{note.locked ? "Removing the lock…" : "Locking…"}</p> : <NoteEditor noteId={note.id} cryptoKey={note.locked ? key : undefined} onReady={setApi} />}
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
      <NoteActionsSheet
        open={menu}
        onClose={() => setMenu(false)}
        note={note}
        api={api}
        now={now}
        timeZone={timeZone}
        onHistory={() => {
          setMenu(false)
          setHistory(true)
        }}
        onLock={() => {
          setMenu(false)
          setLocking(true)
        }}
        onRemoveLock={() => {
          setMenu(false)
          setUnlockConfirm(true)
        }}
        onToggleFavourite={() => {
          void store.update("notes", note.id, { favourite: !note.favourite })
          setMenu(false)
        }}
        onDelete={() => {
          setMenu(false)
          setConfirming(true)
        }}
      />
      <LockSheet open={locking} onClose={() => setLocking(false)} onLock={lock} />
      <VersionHistory open={history} onClose={() => setHistory(false)} store={store} noteId={note.id} title={note.title} doc={api?.doc ?? null} timeZone={timeZone} />
      <Dialog
        open={unlockConfirm}
        onClose={() => setUnlockConfirm(false)}
        title="Remove the lock?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setUnlockConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void unlockForGood()}>
              Remove lock
            </Button>
          </>
        }
      >
        The note will open without a PIN on every device you're signed in on.
      </Dialog>
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
