import { Button, TaskRow } from "@personal/ui"
import { useEffect, useRef, useState } from "react"
import { completeTask, reopenTask } from "../../data/actions"
import type { Stored } from "../../data/db"
import { useStore } from "../../data/session"
import { fromInputValues, isOverdue, toInputValues } from "../format"
import { useToast } from "../shell/toast-provider"
import { PriorityBadge, TaskMeta, type TaskMetaContext } from "./task-meta"

type Props = { task: Stored<"tasks">; ctx: TaskMetaContext; onOpen: (id: string) => void; selected?: boolean }

const TICK_MS = 700
const LEAVE_MS = 280

/**
 * One task. Completing follows motion.md: the box pops and the title strikes, after 700ms the
 * row fades out and the task is saved as done, then an Undo toast shows for 5s.
 */
export function TaskItem({ task, ctx, onOpen, selected = false }: Props) {
  const store = useStore()
  const { showToast } = useToast()
  const [phase, setPhase] = useState<"idle" | "ticked" | "leaving">("idle")
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const done = task.status === "done"
  const overdue = !done && task.due_at ? isOverdue(task.due_at, task.due_has_time, ctx.now, ctx.timeZone) : false

  const toggle = () => {
    if (done) {
      void reopenTask(store, task)
      return
    }
    if (phase !== "idle") {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      setPhase("idle")
      return
    }
    setPhase("ticked")
    timers.current.push(
      window.setTimeout(() => setPhase("leaving"), TICK_MS),
      window.setTimeout(() => {
        void completeTask(store, task, ctx.timeZone)
          .then(() => showToast({ message: "Task completed", actionLabel: "Undo", onAction: () => void reopenTask(store, task) }))
          .catch((e: unknown) => {
            console.error("Could not complete task", e)
            setPhase("idle")
          })
      }, TICK_MS + LEAVE_MS),
    )
  }

  const moveToToday = () => {
    if (!task.due_at) return
    const { time } = toInputValues(task.due_at, ctx.timeZone)
    const today = toInputValues(ctx.now.toISOString(), ctx.timeZone).date
    const next = fromInputValues(today, task.due_has_time ? time : "", ctx.timeZone)
    if (next) void store.update("tasks", task.id, { due_at: next })
  }

  return (
    <TaskRow
      title={task.title || "Untitled"}
      done={done || phase !== "idle"}
      leaving={phase === "leaving"}
      warn={overdue}
      selected={selected}
      onToggle={toggle}
      onOpen={() => onOpen(task.id)}
      checkLabel={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
      meta={<TaskMeta task={task} ctx={ctx} />}
      trailing={
        overdue ? (
          <Button size="sm" onClick={moveToToday}>
            Move to today
          </Button>
        ) : (
          <PriorityBadge priority={task.priority} />
        )
      }
    />
  )
}
