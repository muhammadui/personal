import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"

const EMPTY = new Set<string>()

/** Ids of records with changes still waiting in the outbox, for "Not synced" markers. */
export function useUnsyncedIds(): Set<string> {
  const store = useStore()
  return useLiveQuery(
    async () => {
      const rows = await store.db.outbox.toArray()
      return new Set(rows.map((r) => r.mutation.recordId))
    },
    [store],
    EMPTY,
  )
}
