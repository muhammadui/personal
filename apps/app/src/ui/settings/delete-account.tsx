import { Button, Field, PasswordInput, Sheet } from "@personal/ui"
import { TriangleAlert } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useSession, useSessionContext } from "../../data/session"
import { authClient } from "../../lib/auth-client"
import { prehashPassword } from "../../lib/password"

/** Delete account: a danger button, then a sheet that asks for the password. */
export function DeleteAccount() {
  const { user } = useSession()
  const { signOut } = useSessionContext()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setOpen(false)
    setPassword("")
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!navigator.onLine) {
      setError("You're offline. Connect to the internet to delete your account.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: failed } = await authClient.deleteUser({ password: await prehashPassword(user.email, password) })
      if (failed) {
        setBusy(false)
        setError(failed.status === 400 || failed.status === 401 ? "Wrong password." : failed.message || "Couldn't delete the account. Try again.")
        return
      }
      await signOut()
    } catch (err) {
      console.error("Delete account failed", err)
      setBusy(false)
      setError("Couldn't reach the server. Try again.")
    }
  }

  return (
    <>
      <Button variant="ghost" size="lg" block style={{ color: "var(--danger)" }} onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <Sheet open={open} onClose={close} label="Delete account">
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <span className="tile enter" style={{ width: 52, height: 52, flexBasis: 52, borderRadius: "var(--radius-lg)", background: "var(--danger-tint)", color: "var(--danger)" }}>
            <TriangleAlert size={24} strokeWidth={2} aria-hidden />
          </span>
          <div className="enter enter-1 flex flex-col gap-1.5">
            <h2 className="t-title2">Delete account</h2>
            <p className="t-body" style={{ color: "var(--ink-secondary)" }}>
              This deletes your account and everything synced to it. It can't be undone.
            </p>
          </div>
          <Field label={`Password for ${user.email}`} htmlFor="delete-password" error={error} className="enter enter-2">
            <PasswordInput id="delete-password" autoComplete="current-password" value={password} invalid={Boolean(error)} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" variant="danger" size="xl" block busy={busy} disabled={!password} className="enter enter-3">
            {busy ? "Deleting…" : "Delete account"}
          </Button>
          <Button variant="ghost" size="lg" block disabled={busy} onClick={close} className="enter enter-4">
            Cancel
          </Button>
        </form>
      </Sheet>
    </>
  )
}
