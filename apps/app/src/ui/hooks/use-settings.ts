import { useSession } from "../../data/session"
import type { Stored } from "../../data/db"
import { DEFAULT_TIMEZONE, getSettings } from "../../data/queries"
import { useLiveQuery } from "../../data/use-live-query"

/** The settings record (undefined until the first sync brings it), and the user's time zone. */
export function useSettings(): { settings: Stored<"settings"> | undefined; timeZone: string } {
  const { store } = useSession()
  const settings = useLiveQuery(() => getSettings(store.db), [store], undefined)
  return { settings, timeZone: settings?.timezone ?? DEFAULT_TIMEZONE }
}
