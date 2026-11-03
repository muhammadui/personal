import type { Stored } from "../../data/db"
import { lists, openTasks } from "../../data/queries"
import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"

export type ListWithCount = Stored<"lists"> & { openCount: number }

/** Lists (Inbox first) with the number of open tasks in each. */
export function useLists(): { lists: ListWithCount[]; loaded: boolean } {
  const store = useStore()
  return useLiveQuery<{ lists: ListWithCount[]; loaded: boolean }>(
    async () => {
      const [all, open] = await Promise.all([lists(store.db), openTasks(store.db)])
      const counts = new Map<string, number>()
      const inbox = all.find((l) => l.is_inbox)
      for (const t of open) {
        const key = t.list_id ?? inbox?.id
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      return { lists: all.map((l) => ({ ...l, openCount: counts.get(l.id) ?? 0 })), loaded: true }
    },
    [store],
    { lists: [], loaded: false },
  )
}
