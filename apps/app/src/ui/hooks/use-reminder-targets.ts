import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"

const EMPTY = new Map<string, string>()

/** Item id -> fire time of its scheduled reminder, for the bell marker on rows. */
export function useReminderTargets(): Map<string, string> {
  const store = useStore()
  return useLiveQuery(
    async () => {
      const active = await store.db.reminders.filter((r) => r.status === "scheduled" && !r.deleted_at).toArray()
      return new Map(active.map((r) => [r.target_id, r.fire_at]))
    },
    [store],
    EMPTY,
  )
}
