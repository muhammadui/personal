import { IconButton, SyncStatus } from "@personal/ui"
import { useNavigate } from "@tanstack/react-router"
import { Bell } from "lucide-react"
import { useUnreadCount } from "./hooks/use-unread-count"
import { emitUi } from "./shell/events"
import { useSyncLabel } from "./shell/use-sync-label"

/** Right side of a page header: sync pill (desktop) and the bell. */
export function HeaderStatus({ showSync = true }: { showSync?: boolean }) {
  const unread = useUnreadCount()
  const sync = useSyncLabel()
  const navigate = useNavigate()
  return (
    <>
      {showSync ? (
        <span className="hidden md:inline-flex">
          {sync.needsSignIn ? (
            <button type="button" className="pill-status pill-warn border-0" onClick={() => emitUi({ type: "session-expired" })}>
              Sign in again
            </button>
          ) : (
            <SyncStatus pill state={sync.state} label={sync.state === "ok" ? "Synced" : sync.label} />
          )}
        </span>
      ) : null}
      <IconButton large label={unread ? `Notifications, ${unread} unread` : "Notifications"} pip={unread > 0} onClick={() => void navigate({ to: "/notifications" })}>
        <Bell size={20} strokeWidth={2} aria-hidden />
      </IconButton>
    </>
  )
}
