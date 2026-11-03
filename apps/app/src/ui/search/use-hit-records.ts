import type { Stored } from "../../data/db"
import type { SearchHit } from "../../data/search"
import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"

export type HitRecords = { notes: Map<string, Stored<"notes">>; tasks: Map<string, Stored<"tasks">> }
const EMPTY: HitRecords = { notes: new Map(), tasks: new Map() }

/** The notes and tasks behind search hits, for meta lines (edited time, due date, locked). */
export function useHitRecords(hits: SearchHit[]): HitRecords {
  const store = useStore()
  const noteIds = hits.filter((h) => h.kind === "note").map((h) => h.id).join(",")
  const taskIds = hits.filter((h) => h.kind === "task").map((h) => h.id).join(",")
  return useLiveQuery(
    async () => {
      const [n, t] = await Promise.all([store.db.notes.bulkGet(noteIds ? noteIds.split(",") : []), store.db.tasks.bulkGet(taskIds ? taskIds.split(",") : [])])
      return {
        notes: new Map(n.filter((x): x is Stored<"notes"> => Boolean(x)).map((x) => [x.id, x])),
        tasks: new Map(t.filter((x): x is Stored<"tasks"> => Boolean(x)).map((x) => [x.id, x])),
      }
    },
    [store, noteIds, taskIds],
    EMPTY,
  )
}
