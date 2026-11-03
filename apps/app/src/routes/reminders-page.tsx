import { Button, EmptyState, List } from "@personal/ui"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { BellRing, Plus } from "lucide-react"
import type { Stored } from "../data/db"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { dueLabel, firstLine } from "../ui/format"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { alertsShort } from "../ui/reminders/reminder-draft"
import { ReminderEditSheet } from "../ui/reminders/reminder-edit-sheet"
import { emitUi } from "../ui/shell/events"
import { repeatShort } from "../ui/tasks/repeat-options"

const TILE = { width: 32, height: 32, flexBasis: 32, marginTop: 2 } as const
const BODY = { fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)" } as const

/** Standalone reminders that are still to come, soonest first. Tap one to edit it. */
export function RemindersPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const navigate = useNavigate()
  const { edit } = useSearch({ from: "/reminders" })
  const reminders = useLiveQuery<Stored<"reminders">[] | null>(
    async () => {
      const rows = await store.db.reminders.filter((r) => r.target_type === "standalone" && r.status === "scheduled" && !r.deleted_at).toArray()
      return rows.sort((a, b) => a.fire_at.localeCompare(b.fire_at))
    },
    [store],
    null,
  )
  // `edit` is a reminder id, or the first id of a repeating reminder's chain (from a notification).
  const editing = edit && reminders ? (reminders.find((r) => r.id === edit) ?? reminders.find((r) => r.target_id === edit) ?? null) : null
  const openEdit = (id: string | undefined) => void navigate({ to: "/reminders", search: id ? { edit: id } : {}, replace: true })

  return (
    <>
      <BackLink to="/search" label="Search" />
      <PageHeader
        title="Reminders"
        actions={
          <>
            <Button size="sm" onClick={() => emitUi({ type: "quick-add", kind: "reminder" })}>
              <Plus size={16} strokeWidth={2} aria-hidden />
              New reminder
            </Button>
            <HeaderStatus />
          </>
        }
      />
      {reminders && reminders.length === 0 ? (
        <EmptyState
          icon={<BellRing size={24} strokeWidth={2} aria-hidden />}
          title="No reminders yet"
          action={
            <Button size="sm" onClick={() => emitUi({ type: "quick-add", kind: "reminder" })}>
              Add a reminder
            </Button>
          }
        >
          Add one for anything that is not a task or a note.
        </EmptyState>
      ) : null}
      {reminders && reminders.length > 0 ? (
        <List>
          {reminders.map((r, i) => {
            const past = Date.parse(r.fire_at) < now.getTime()
            const meta = [dueLabel(r.fire_at, true, now, timeZone), alertsShort(r.alerts_before, r.nag_every_min, r.nag_count), r.recurrence_rule ? repeatShort(r.recurrence_rule) : ""].filter(Boolean).join(" · ")
            const details = r.body ? firstLine(r.body, 140) : ""
            return (
              <button key={r.id} type="button" className={`task row-btn ${i < 8 ? `enter enter-${i + 1}` : ""}`} style={{ alignItems: "flex-start" }} onClick={() => openEdit(r.id)}>
                <span className="tile" style={TILE}>
                  <BellRing size={16} strokeWidth={2} aria-hidden />
                </span>
                <span className="task-body">
                  <span className="t-body-strong">{r.title}</span>
                  {details ? (
                    <span className="t-meta truncate" style={BODY}>
                      {details}
                    </span>
                  ) : null}
                  <span className={`t-meta ${past ? "meta-warn" : ""}`} style={{ fontSize: 12 }}>
                    {meta}
                  </span>
                </span>
              </button>
            )
          })}
        </List>
      ) : null}
      {editing ? <ReminderEditSheet key={editing.id} reminder={editing} onClose={() => openEdit(undefined)} /> : null}
    </>
  )
}
