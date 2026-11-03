import { List } from "@personal/ui"
import type { Stored } from "../../data/db"
import { useLists } from "../hooks/use-lists"
import { useReminderTargets } from "../hooks/use-reminder-targets"
import { useUnsyncedIds } from "../hooks/use-unsynced-ids"
import { TaskItem } from "./task-item"
import { useTaskSheet } from "./task-sheet-provider"

type Props = {
  tasks: Stored<"tasks">[]
  now: Date
  timeZone: string
  /** Show each task's list in its meta line. */
  showList?: boolean
  warn?: boolean
}

/** `.list` of task rows, with reminder, list and unsynced markers. */
export function TaskList({ tasks, now, timeZone, showList = false, warn = false }: Props) {
  const reminders = useReminderTargets()
  const unsynced = useUnsyncedIds()
  const { lists } = useLists()
  const { openTask, openId } = useTaskSheet()
  const inbox = lists.find((l) => l.is_inbox)
  const byId = new Map(lists.map((l) => [l.id, l]))
  return (
    <List warn={warn}>
      {tasks.map((t, i) => {
        const list = showList ? (t.list_id ? byId.get(t.list_id) : inbox) : undefined
        return (
          <div key={t.id} className={i < 8 ? `enter enter-${i + 1}` : undefined}>
            <TaskItem
              task={t}
              selected={openId === t.id}
              onOpen={openTask}
              ctx={{
                now,
                timeZone,
                reminderAt: reminders.get(t.id),
                unsynced: unsynced.has(t.id),
                list: list ? { name: list.name, colour: list.colour, inbox: list.is_inbox } : undefined,
              }}
            />
          </div>
        )
      })}
    </List>
  )
}
