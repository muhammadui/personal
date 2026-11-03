import { Banner, Button } from "@personal/ui"
import { CloudOff, KeyRound, RefreshCw, WifiOff } from "lucide-react"
import { useSession, useSyncStatus } from "../../data/session"
import { emitUi } from "./events"

/** Offline, server unreachable and signed-out-of-sync banners (States.dc.html). Warn, never danger. */
export function SyncBanner() {
  const s = useSyncStatus()
  const { engine } = useSession()
  if (s.needsSignIn) {
    return (
      <Banner
        tone="warn"
        icon={<KeyRound aria-hidden />}
        title="Sign in again to sync"
        action={
          <Button size="sm" onClick={() => emitUi({ type: "session-expired" })}>
            Sign in
          </Button>
        }
      >
        {s.pending > 0 ? `${s.pending} ${s.pending === 1 ? "change is" : "changes are"} saved on this device and will sync after you sign in.` : "Your work is saved on this device."}
      </Banner>
    )
  }
  if (!s.online) {
    return (
      <Banner tone="warn" icon={<WifiOff aria-hidden />} title="You're offline">
        {s.pending > 0
          ? `${s.pending} ${s.pending === 1 ? "change is" : "changes are"} saved on this device and will sync when you reconnect.`
          : "Saved on this device. Will sync when you're back online."}
      </Banner>
    )
  }
  if (s.lastError && s.pending > 0 && !s.syncing) {
    return (
      <Banner
        tone="warn"
        icon={<CloudOff aria-hidden />}
        title="Can't reach Personal right now"
        action={
          <Button size="sm" onClick={() => void engine.syncNow()}>
            Retry
          </Button>
        }
      >
        You're online, but our servers aren't responding. Your changes are safe here.
      </Banner>
    )
  }
  if (s.syncing && s.pending >= 10) {
    return (
      <Banner tone="info" icon={<RefreshCw aria-hidden />} title={`Syncing ${s.pending} changes`}>
        This can take a moment after a long time offline.
      </Banner>
    )
  }
  return null
}
