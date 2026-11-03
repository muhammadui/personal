import { Button, List, SectionLabel } from "@personal/ui"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { ChevronRight, Plus } from "lucide-react"
import { useState } from "react"
import { BackLink } from "../ui/back-link"
import { useLists } from "../ui/hooks/use-lists"
import { ListDot } from "../ui/lists/list-dot"
import { NewListSheet } from "../ui/lists/new-list-sheet"
import { PageHeader } from "../ui/page-header"

/** PhoneLists: task lists with counts and "New list". (Note folders come later.) */
export function ListsPage() {
  const { lists } = useLists()
  const search = useSearch({ from: "/lists" })
  const navigate = useNavigate()
  const [creating, setCreating] = useState(Boolean(search.new))

  return (
    <>
      <BackLink to="/settings" label="Settings" />
      <PageHeader title="Lists" />
      <section className="enter enter-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Task lists</SectionLabel>
          <Button variant="ghost" size="sm" style={{ color: "var(--text-accent)" }} onClick={() => setCreating(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            New list
          </Button>
        </div>
        <List>
          {lists.map((l) => (
            <Link key={l.id} to="/lists/$listId" params={{ listId: l.id }} className="task" style={{ minHeight: 52, textDecoration: "none", color: "inherit" }}>
              <ListDot colour={l.colour} inbox={l.is_inbox} size={12} />
              <span className="task-body">
                <span className="t-body-strong" style={{ fontWeight: 600 }}>
                  {l.name}
                </span>
              </span>
              {l.openCount ? <span className="t-meta">{l.openCount}</span> : null}
              <span className="flex" style={{ color: "var(--ink-faint)" }}>
                <ChevronRight size={18} strokeWidth={2} aria-hidden />
              </span>
            </Link>
          ))}
        </List>
      </section>
      <NewListSheet open={creating} onClose={() => setCreating(false)} onCreated={(id) => void navigate({ to: "/lists/$listId", params: { listId: id } })} />
    </>
  )
}
