import { PERSONAL_NAMESPACE, SYNCED_TABLES } from "@personal/core"
import { v5 as uuidv5 } from "uuid"
import type { Store } from "./store"

export const WAITING_AFTER_MS = 10 * 60 * 1000
export const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

/** One "changes waiting" notice per device, reused rather than stacked. */
export function waitingNoticeId(deviceId: string): string {
  return uuidv5(`sync-waiting:${deviceId}`, PERSONAL_NAMESPACE)
}

/**
 * docs/sync.md "Storage persistence": when changes have waited more than 10 minutes while the
 * device is online, say so in the notification centre; clear it once they are pushed.
 */
export async function updateWaitingNotice(store: Store, online: boolean, now = Date.now()): Promise<void> {
  const id = waitingNoticeId(store.deviceId)
  const oldest = await store.db.outbox.orderBy("seq").first()
  const count = await store.pendingCount()
  const existing = await store.db.notifications.get(id)
  const stale = oldest !== undefined && now - oldest.created_at > WAITING_AFTER_MS
  if (online && stale && count > 0) {
    const title = count === 1 ? "1 change waiting to sync" : `${count} changes waiting to sync`
    const body = "Saved on this device. It will sync when the connection works again."
    if (!existing) {
      await store.create("notifications", { kind: "sync", title, body, link: "/settings", read_at: null, occurrence_id: null }, id)
    } else if (existing.title !== title || existing.read_at || existing.deleted_at) {
      await store.update("notifications", id, { title, body, read_at: null, deleted_at: null })
    }
  } else if (count === 0 && existing && !existing.read_at && !existing.deleted_at) {
    await store.update("notifications", id, { read_at: new Date(now).toISOString() })
  }
}

/**
 * Drop local copies of records that have been in Trash for more than 30 days. The server purges
 * the same rows daily; this is a local cleanup only, so nothing goes to the outbox.
 */
export async function purgeLocalTombstones(store: Store, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - PURGE_AFTER_MS).toISOString()
  let purged = 0
  for (const table of SYNCED_TABLES) {
    const t = store.db.recordTable(table)
    const old = await t.filter((r) => Boolean(r.deleted_at) && (r.deleted_at as string) < cutoff).primaryKeys()
    if (old.length > 0) {
      await t.bulkDelete(old)
      if (table === "notes") await store.db.doc_updates.where("note_id").anyOf(old).delete()
      purged += old.length
    }
  }
  return purged
}
