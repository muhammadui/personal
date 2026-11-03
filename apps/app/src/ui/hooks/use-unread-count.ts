import { unreadCount } from "../../data/queries"
import { useStore } from "../../data/session"
import { useLiveQuery } from "../../data/use-live-query"

export function useUnreadCount(): number {
  const store = useStore()
  return useLiveQuery(() => unreadCount(store.db), [store], 0)
}
