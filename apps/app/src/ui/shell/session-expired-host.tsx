import { Button, Field, PasswordInput, Sheet } from "@personal/ui"
import { KeyRound } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSession, useSessionContext, useSyncStatus } from "../../data/session"
import { signIn } from "../../lib/auth-client"
import { onUi } from "./events"

/** SessionExpired sheet: opens once when the server session runs out, or on request. */
export function SessionExpiredHost() {
  const { user } = useSession()
  const { startSession } = useSessionContext()
  const status = useSyncStatus()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shown = useRef(false)

  useEffect(() => onUi((e) => e.type === "session-expired" && setOpen(true)), [])
  useEffect(() => {
    if (status.needsSignIn && !shown.current) {
      shown.current = true
      setOpen(true)
    }
    if (!status.needsSignIn) shown.current = false
  }, [status.needsSignIn])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await signIn(user.email, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setPassword("")
    setOpen(false)
    await startSession(result.user)
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Sign in again to sync">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <span className="tile tile-warn enter" style={{ width: 52, height: 52, flexBasis: 52, borderRadius: "var(--radius-lg)" }}>
          <KeyRound size={24} strokeWidth={2} aria-hidden />
        </span>
        <div className="enter enter-1 flex flex-col gap-1.5">
          <h2 className="t-title2">Sign in again to sync</h2>
          <p className="t-body" style={{ color: "var(--ink-secondary)" }}>
            Your session expired. Your work is safe
            {status.pending > 0 ? `: ${status.pending} ${status.pending === 1 ? "change is" : "changes are"} saved on this device and will sync after you sign in.` : "."}
          </p>
        </div>
        <Field label={`Password for ${user.email}`} htmlFor="reauth-password" error={error} className="enter enter-2">
          <PasswordInput id="reauth-password" autoComplete="current-password" value={password} invalid={Boolean(error)} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={!password} className="enter enter-3">
          {busy ? "Signing in…" : "Sign in and sync"}
        </Button>
        <Button variant="ghost" size="lg" block onClick={() => setOpen(false)} className="enter enter-4">
          Keep working offline
        </Button>
      </form>
    </Sheet>
  )
}
