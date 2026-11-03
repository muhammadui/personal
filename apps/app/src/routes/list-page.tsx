import { Button, Dialog, EmptyState, Field, IconButton, Sheet, TextInput } from "@personal/ui"
import { useNavigate, useParams } from "@tanstack/react-router"
import { ListTodo, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import type { Stored } from "../data/db"
import { listTasks } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { deleteList } from "../ui/lists/list-actions"
import { ListDot } from "../ui/lists/list-dot"
import { PageHeader } from "../ui/page-header"
import { emitUi } from "../ui/shell/events"
import { useToast } from "../ui/shell/toast-provider"
import { QuickAdd } from "../ui/tasks/quick-add"
import { TaskList } from "../ui/tasks/task-list"

export function ListPage() {
  const { listId } = useParams({ from: "/lists/$listId" })
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState("")
  const [confirming, setConfirming] = useState(false)

  const list = useLiveQuery<Stored<"lists"> | null | undefined>(async () => (await store.db.lists.get(listId)) ?? null, [store, listId], undefined)
  const tasks = useLiveQuery(async () => (list && !list.deleted_at ? listTasks(store.db, list.id, list.is_inbox) : null), [store, list?.id, list?.is_inbox, list?.deleted_at], null)

  if (list === undefined) return null
  if (list === null || list.deleted_at) {
    return (
      <>
        <BackLink to="/lists" label="Lists" />
        <EmptyState icon={<ListTodo size={24} strokeWidth={2} aria-hidden />} title="This list was deleted">
          Restore it from Trash if you need it back.
        </EmptyState>
      </>
    )
  }

  const remove = async () => {
    setConfirming(false)
    await deleteList(store, list.id)
    showToast({ message: "List moved to Trash" })
    void navigate({ to: "/lists" })
  }

  return (
    <>
      <BackLink to="/lists" label="Lists" />
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <ListDot colour={list.colour} inbox={list.is_inbox} size={12} />
            {list.name}
          </span>
        }
        actions={
          <>
            {!list.is_inbox ? (
              <IconButton large label="List actions" onClick={() => setMenu(true)}>
                <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
              </IconButton>
            ) : null}
            <HeaderStatus />
          </>
        }
      />
      <QuickAdd timeZone={timeZone} now={now} listId={list.id} className="enter enter-1 hidden md:block" />
      {tasks && tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={24} strokeWidth={2} aria-hidden />}
          title={`${list.name} is empty`}
          action={
            <Button size="sm" onClick={() => emitUi({ type: "quick-add" })}>
              Add task
            </Button>
          }
        >
          Add a task here, or move one in from Inbox.
        </EmptyState>
      ) : null}
      {tasks && tasks.length > 0 ? <TaskList tasks={tasks} now={now} timeZone={timeZone} /> : null}

      <Sheet open={menu} onClose={() => setMenu(false)} label="List actions">
        <h2 className="t-title3">{list.name}</h2>
        <div className="list">
          <button
            type="button"
            className="task row-btn"
            style={{ minHeight: 52 }}
            onClick={() => {
              setMenu(false)
              setName(list.name)
              setRenaming(true)
            }}
          >
            <Pencil size={20} strokeWidth={2} aria-hidden style={{ color: "var(--ink-muted)" }} />
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Rename
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
              Delete list
            </span>
          </button>
        </div>
      </Sheet>
      <Sheet open={renaming} onClose={() => setRenaming(false)} label="Rename list">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) void store.update("lists", list.id, { name: name.trim() })
            setRenaming(false)
          }}
        >
          <h2 className="t-title3">Rename list</h2>
          <Field label="Name" htmlFor="rename-list">
            <TextInput id="rename-list" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" size="xl" block disabled={!name.trim()}>
            Save
          </Button>
        </form>
      </Sheet>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete "${list.name}"?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              Delete list
            </Button>
          </>
        }
      >
        The list and its tasks move to Trash. You can restore them for 30 days.
      </Dialog>
    </>
  )
}
