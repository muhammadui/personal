import { Button, Dialog } from "@personal/ui"
import { LogOut } from "lucide-react"
import { useState } from "react"
import { useSessionContext, useSyncStatus } from "../../data/session"

/** Sign out of this device; warns first when changes have not synced. */
export function SignOutButton() {
  const { signOut } = useSessionContext()
  const { pending } = useSyncStatus()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    await signOut()
  }

  return (
    <>
      <Button variant="ghost" size="lg" block style={{ color: "var(--danger)" }} busy={busy} onClick={() => (pending > 0 ? setConfirming(true) : void run())}>
        <LogOut size={18} strokeWidth={2} aria-hidden />
        Sign out of this device
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Sign out anyway?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Stay signed in
            </Button>
            <Button variant="danger" busy={busy} onClick={() => void run()}>
              Sign out
            </Button>
          </>
        }
      >
        {pending} {pending === 1 ? "change hasn't" : "changes haven't"} synced yet. Sign out anyway? They will be lost.
      </Dialog>
    </>
  )
}
