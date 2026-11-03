import { Badge } from "@personal/ui"
import { Bell, Clock, CloudOff, Flag, Repeat } from "lucide-react"
import type { Stored } from "../../data/db"
import { dayDiff, dueLabel, isOverdue, timeLabel } from "../format"
import { ListDot } from "../lists/list-dot"
import { repeatShort } from "./repeat-options"

export type TaskMetaContext = {
  now: Date
  timeZone: string
  reminderAt?: string | undefined
  list?: { name: string; colour: string | null | undefined; inbox: boolean } | undefined
  unsynced?: boolean
}

/** The meta line of a task row: due, reminder, list, repeat, flag, unsynced. */
export function TaskMeta({ task, ctx }: { task: Stored<"tasks">; ctx: TaskMetaContext }) {
  const { now, timeZone } = ctx
  const done = task.status === "done"
  const overdue = !done && task.due_at ? isOverdue(task.due_at, task.due_has_time, now, timeZone) : false
  const sameDay = task.due_at ? dayDiff(new Date(task.due_at), now, timeZone) === 0 : false
  return (
    <>
      {task.due_at ? (
        overdue ? (
          <span className="meta-item meta-warn">{dueLabel(task.due_at, task.due_has_time, now, timeZone)}</span>
        ) : sameDay && task.due_has_time ? (
          <span className="meta-item">
            <Clock aria-hidden strokeWidth={2} />
            {timeLabel(task.due_at, timeZone)}
          </span>
        ) : sameDay ? null : (
          <span className="meta-item">{dueLabel(task.due_at, task.due_has_time, now, timeZone)}</span>
        )
      ) : null}
      {ctx.reminderAt && !done ? (
        <span className="meta-item meta-accent">
          <Bell aria-hidden strokeWidth={2} />
          {timeLabel(ctx.reminderAt, timeZone)}
        </span>
      ) : null}
      {ctx.list ? (
        <span className="meta-item">
          <ListDot colour={ctx.list.colour} inbox={ctx.list.inbox} />
          {ctx.list.name}
        </span>
      ) : null}
      {task.recurrence_rule ? (
        <span className="meta-item">
          <Repeat aria-hidden strokeWidth={2} />
          {repeatShort(task.recurrence_rule)}
        </span>
      ) : null}
      {task.flagged && !done ? (
        <span className="meta-item meta-accent">
          <Flag aria-hidden strokeWidth={2} />
          Flagged
        </span>
      ) : null}
      {ctx.unsynced ? (
        <span className="meta-item meta-warn">
          <CloudOff aria-hidden strokeWidth={2} />
          Not synced
        </span>
      ) : null}
    </>
  )
}

export function PriorityBadge({ priority }: { priority: Stored<"tasks">["priority"] }) {
  if (priority === "high") return <Badge tone="warn">HIGH</Badge>
  if (priority === "medium") return <Badge tone="accent">MEDIUM</Badge>
  return null
}
