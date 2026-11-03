import { Button, Chip, EmptyState, IconButton, List, SectionLabel } from "@personal/ui"
import { useNavigate } from "@tanstack/react-router"
import { FileText, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { addNote } from "../data/actions"
import { notesList } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { NoteGridCard } from "../ui/notes/note-grid-card"
import { NoteListRow } from "../ui/notes/note-list-row"
import { PageHeader } from "../ui/page-header"

/** PhoneNotes / Notes: search, pinned cards, then recent notes (list on phones, grid on desktop). */
export function NotesPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const notes = useLiveQuery(() => notesList(store.db), [store], null)

  const create = async () => {
    const id = await addNote(store)
    void navigate({ to: "/notes/$noteId", params: { noteId: id } })
  }

  const q = query.trim().toLowerCase()
  const filtered = (notes ?? []).filter((n) => (!pinnedOnly || n.pinned) && (!q || n.title.toLowerCase().includes(q) || (n.plain_text ?? "").toLowerCase().includes(q)))
  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  return (
    <>
      <PageHeader
        title={
          <>
            <span className="md:hidden">Notes</span>
            <span className="hidden md:inline">All notes</span>
          </>
        }
        actions={
          <>
            <IconButton large label="Trash" className="md:hidden" onClick={() => void navigate({ to: "/trash" })}>
              <Trash2 size={20} strokeWidth={2} aria-hidden />
            </IconButton>
            <IconButton large label="New note" className="md:hidden" onClick={() => void create()}>
              <Plus size={20} strokeWidth={2} aria-hidden />
            </IconButton>
            <Button variant="primary" className="hidden md:inline-flex" onClick={() => void create()}>
              <Plus size={16} strokeWidth={2} aria-hidden />
              New note
            </Button>
            <span className="hidden md:contents">
              <HeaderStatus />
            </span>
          </>
        }
      />
      {notes && notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={2} aria-hidden />}
          title="No notes yet"
          action={
            <Button variant="primary" size="sm" onClick={() => void create()}>
              <Plus size={14} strokeWidth={2} aria-hidden />
              New note
            </Button>
          }
        >
          Write anything: lists, ideas, meeting notes. It saves as you type.
        </EmptyState>
      ) : notes ? (
        <>
          <label className="searchbox enter enter-1" style={{ height: 44 }}>
            <Search size={18} strokeWidth={2} aria-hidden />
            <span className="sr-only">Search notes</span>
            <input type="search" placeholder={`Search ${notes.length} ${notes.length === 1 ? "note" : "notes"}`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="enter enter-2 flex gap-2 overflow-x-auto">
            <Chip on={!pinnedOnly} onClick={() => setPinnedOnly(false)}>
              All · {notes.length}
            </Chip>
            <Chip on={pinnedOnly} onClick={() => setPinnedOnly(true)}>
              Pinned · {notes.filter((n) => n.pinned).length}
            </Chip>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={<Search size={24} strokeWidth={2} aria-hidden />} title={`No results for “${query.trim()}”`}>
              Check the spelling, or try fewer words.
            </EmptyState>
          ) : null}
          {pinned.length > 0 ? (
            <section className="flex flex-col gap-2 md:gap-3">
              <SectionLabel className="enter enter-3">Pinned</SectionLabel>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:gap-4">
                {pinned.map((n, i) => (
                  <NoteGridCard key={n.id} note={n} now={now} timeZone={timeZone} className={i < 6 ? `enter enter-${i + 3}` : ""} />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length > 0 ? (
            <section className="flex flex-col gap-2 md:gap-3">
              <SectionLabel className="enter enter-5">Recent</SectionLabel>
              <div className="md:hidden">
                <List>
                  {rest.map((n, i) => (
                    <NoteListRow key={n.id} note={n} now={now} timeZone={timeZone} className={i < 4 ? `enter enter-${i + 5}` : ""} />
                  ))}
                </List>
              </div>
              <div className="hidden gap-4 md:grid md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
                {rest.map((n, i) => (
                  <NoteGridCard key={n.id} note={n} now={now} timeZone={timeZone} className={i < 4 ? `enter enter-${i + 5}` : ""} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  )
}
