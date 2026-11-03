import type { SyncState } from "@personal/ui"
import { useSyncStatus } from "../../data/session"
import { relativeTime } from "../format"
import { useNow } from "../hooks/use-now"
import { useTimeZone } from "../hooks/use-time-zone"

export type SyncLabel = { state: SyncState; label: string; pending: number; online: boolean; needsSignIn: boolean; lastError: string | null }

/** One short phrase for the sync state. Offline and waiting are warn, never danger. */
export function useSyncLabel(): SyncLabel {
  const s = useSyncStatus()
  const now = useNow()
  const timeZone = useTimeZone()
  const base = { pending: s.pending, online: s.online, needsSignIn: s.needsSignIn, lastError: s.lastError }
  if (s.needsSignIn) return { ...base, state: "off", label: "Sign in again" }
  if (!s.online) return { ...base, state: "off", label: s.pending > 0 ? `Offline · ${s.pending} waiting` : "Offline" }
  if (s.syncing) return { ...base, state: "busy", label: "Syncing…" }
  if (s.pending > 0) return { ...base, state: "off", label: `${s.pending} waiting` }
  if (s.lastSyncAt) {
    const rel = relativeTime(new Date(s.lastSyncAt).toISOString(), now, timeZone)
    return { ...base, state: "ok", label: rel === "Just now" ? "Synced just now" : rel === "Yesterday" ? "Synced yesterday" : `Synced ${rel}` }
  }
  return { ...base, state: "busy", label: "Connecting…" }
}
