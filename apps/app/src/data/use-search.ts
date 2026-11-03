import { liveQuery } from "dexie"
import { useEffect, useMemo, useState } from "react"
import { buildSearchDocs, SearchIndex, type SearchHit } from "./search"
import { useStore } from "./session"

/** Search notes, tasks and tags offline. Re-indexes when the underlying tables change. */
export function useSearch(query: string): { hits: SearchHit[]; ready: boolean } {
  const store = useStore()
  const index = useMemo(() => new SearchIndex(), [])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const sub = liveQuery(() => buildSearchDocs(store.db)).subscribe({
      next: (docs) => {
        index.load(docs)
        setVersion((v) => v + 1)
      },
      error: (e: unknown) => console.error("Search index failed", e),
    })
    return () => sub.unsubscribe()
  }, [store, index])

  const hits = useMemo(() => (version > 0 ? index.search(query) : []), [index, query, version])
  return { hits, ready: version > 0 }
}
