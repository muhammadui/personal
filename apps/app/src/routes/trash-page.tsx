import { Banner, Button, EmptyState, List } from "@personal/ui"
import { FileText, Info, ListTodo, RotateCcw, SquareCheck, Trash2 } from "lucide-react"
import { trash } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { firstLine, relativeTime } from "../ui/format"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { restoreList } from "../ui/lists/list-actions"
import { PageHeader } from "../ui/page-header"
import { useToast } from "../ui/shell/toast-provider"

const lowerRelative = (rel: string) => (rel === "Just now" || rel === "Yesterday" ? rel.toLowerCase() : rel)

type Item = { id: string; kind: "task" | "note" | "list"; title: string; deletedAt: string }

/** PhoneTrash. Items are purged by the server after 30 days; there is no manual "empty". */
export function TrashPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const { showToast } = useToast()
  const data = useLiveQuery(() => trash(store.db), [store], null)

  const items: Item[] = data
    ? [
        ...data.notes.map((n) => ({ id: n.id, kind: "note" as const, title: n.title || firstLine(n.plain_text ?? "") || "Untitled", deletedAt: n.deleted_at! })),
        ...data.tasks.filter((t) => !t.parent_id).map((t) => ({ id: t.id, kind: "task" as const, title: t.title || "Untitled", deletedAt: t.deleted_at! })),
        ...data.lists.map((l) => ({ id: l.id, kind: "list" as const, title: l.name, deletedAt: l.deleted_at! })),
      ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    : []

  const restore = async (item: Item) => {
    if (item.kind === "list") await restoreList(store, item.id)
    else await store.restore(item.kind === "task" ? "tasks" : "notes", item.id)
    showToast({ message: `Restored “${item.title}”` })
  }

  const kindLabel = { task: "Task", note: "Note", list: "List" }

  return (
    <>
      <BackLink to="/notes" label="Notes" />
      <PageHeader title="Trash" />
      <Banner tone="info" icon={<Info aria-hidden />} className="enter enter-1">
        <span style={{ fontWeight: 600 }}>Items stay here for 30 days, then they're deleted for good.</span>
      </Banner>
      {data && items.length === 0 ? (
        <EmptyState bare icon={<Trash2 size={24} strokeWidth={2} aria-hidden />} title="Trash is empty">
          Deleted notes and tasks show up here.
        </EmptyState>
      ) : null}
      {items.length > 0 ? (
        <List className="enter enter-2">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="task" style={{ minHeight: 64 }}>
              <span className="tile" style={{ color: "var(--ink-muted)" }}>
                {item.kind === "note" ? <FileText size={18} strokeWidth={2} aria-hidden /> : item.kind === "task" ? <SquareCheck size={18} strokeWidth={2} aria-hidden /> : <ListTodo size={18} strokeWidth={2} aria-hidden />}
              </span>
              <span className="task-body">
                <span className="t-body-strong truncate">{item.title}</span>
                <span className="t-meta" style={{ fontSize: 12 }}>
                  {kindLabel[item.kind]} · deleted {lowerRelative(relativeTime(item.deletedAt, now, timeZone))}
                </span>
              </span>
              <Button size="sm" onClick={() => void restore(item)}>
                <RotateCcw size={14} strokeWidth={2} aria-hidden />
                Restore
              </Button>
            </div>
          ))}
        </List>
      ) : null}
    </>
  )
}
