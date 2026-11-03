import type { Settings } from "@personal/core"
import { ids } from "@personal/core"
import type { Stored } from "../../data/db"
import { DEFAULT_TIMEZONE } from "../../data/queries"
import type { Store } from "../../data/store"

/**
 * Change settings fields. The server creates the record at sign-up; if it has not synced to
 * this device yet, create it locally with the same id so the two merge field by field.
 */
export async function saveSettings(
  store: Store,
  userId: string,
  current: Stored<"settings"> | undefined,
  fields: Partial<Pick<Settings, "theme" | "timezone">>,
): Promise<void> {
  if (current) {
    await store.update("settings", current.id, fields)
    return
  }
  await store.create(
    "settings",
    { theme: "system", timezone: DEFAULT_TIMEZONE, default_reminder_time: "09:00", week_start: 1, ...fields },
    ids.settings(userId),
  )
}
