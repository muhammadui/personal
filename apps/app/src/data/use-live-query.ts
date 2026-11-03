import { liveQuery } from "dexie"
import { useEffect, useState } from "react"

/**
 * Re-run a Dexie query whenever the tables it reads change (local writes or pulled changes).
 * `deps` work like useEffect deps. Returns `initial` until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => setValue(v),
      error: (e: unknown) => console.error("Query failed", e),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
