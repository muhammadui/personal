import { Button, Card } from "@personal/ui"
import { CloudCheck, CloudOff, RefreshCw } from "lucide-react"
import { useSession, useSyncStatus } from "../../data/session"
import { timeLabel } from "../format"

/** "Everything is synced" panel with Sync now (Settings.dc.html). */
export function SyncPanel({ timeZone }: { timeZone: string }) {
  const s = useSyncStatus()
  const { engine } = useSession()
  const ok = s.online && s.pending === 0 && !s.needsSignIn
  const title = !s.online ? "You're offline" : s.syncing ? "Syncing…" : s.pending > 0 ? `${s.pending} ${s.pending === 1 ? "change" : "changes"} waiting` : "Everything is synced"
  const detail = s.lastSyncAt ? `Last synced ${timeLabel(new Date(s.lastSyncAt).toISOString(), timeZone)}` : "Not synced yet on this device"
  return (
    <Card panel className="flex flex-wrap items-center gap-4">
      <span className={`tile tile-lg ${ok ? "tile-success" : s.syncing ? "tile-accent" : "tile-warn"}`}>
        {ok ? <CloudCheck size={24} strokeWidth={2} aria-hidden /> : s.syncing ? <RefreshCw size={24} strokeWidth={2} aria-hidden /> : <CloudOff size={24} strokeWidth={2} aria-hidden />}
      </span>
      <span className="flex flex-[1_1_200px] flex-col gap-0.5">
        <span className="t-title3">{title}</span>
        <span className="t-meta">
          {detail}
          {s.pending > 0 ? " · saved on this device" : " · nothing waiting"}
        </span>
      </span>
      <Button disabled={!s.online || s.syncing} onClick={() => void engine.syncNow()}>
        <RefreshCw size={16} strokeWidth={2} aria-hidden />
        Sync now
      </Button>
    </Card>
  )
}
