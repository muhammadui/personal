import { Button, CodeInput, Field, IconButton, Sheet } from "@personal/ui"
import { ChevronLeft, Mail } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { useSession, useSessionContext } from "../../data/session"
import { sendCode, verifyEmail } from "../../lib/auth-client"
import { takeJustSignedUp } from "../auth/signup-flag"
import { onUi } from "./events"

const RESEND_S = 45

/** Verify.dc.html as a full-screen sheet: right after sign-up, or from the verify banner. */
export function VerifyHost() {
  const { user } = useSession()
  const { refreshUser } = useSessionContext()
  const [open, setOpen] = useState(() => takeJustSignedUp() && !user.emailVerified)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(RESEND_S)

  useEffect(() => onUi((e) => e.type === "verify-email" && setOpen(true)), [])
  useEffect(() => {
    if (!open || wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [open, wait])
  useEffect(() => {
    if (user.emailVerified) setOpen(false)
  }, [user.emailVerified])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    const result = await verifyEmail(user.email, code)
    if (!result.ok) {
      setBusy(false)
      setError(result.message)
      return
    }
    await refreshUser()
    setBusy(false)
    setOpen(false)
  }

  const resend = async () => {
    setError(null)
    const result = await sendCode(user.email, "email-verification")
    if (!result.ok) setError(result.message)
    setWait(RESEND_S)
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Check your email" variant="panel">
      <div className="px-3 pt-2 md:pt-4">
        <IconButton plain large label="Back" onClick={() => setOpen(false)}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      </div>
      <form onSubmit={(e) => void submit(e)} className="flex flex-1 flex-col gap-6 px-6 pt-3 pb-8">
        <span className="tile tile-lg tile-accent enter">
          <Mail size={24} strokeWidth={2} aria-hidden />
        </span>
        <div className="enter enter-1 flex flex-col gap-2">
          <h1 className="t-title1">Check your email</h1>
          <p className="t-body" style={{ color: "var(--ink-muted)" }}>
            We sent a 6-digit code to <strong style={{ color: "var(--ink)" }}>{user.email}</strong>. It expires in 10 minutes.
          </p>
        </div>
        <Field label="Verification code" htmlFor="verify-code" error={error} hint="Paste the code or type it. It fills in automatically from Mail on iPhone." className="enter enter-2">
          <CodeInput id="verify-code" value={code} onChange={setCode} autoFocus />
        </Field>
        <div className="enter enter-3 flex items-center gap-1.5">
          <span className="t-meta">Didn't get it?</span>
          <Button variant="ghost" size="sm" style={{ color: "var(--text-accent)", padding: "0 6px" }} disabled={wait > 0} onClick={() => void resend()}>
            {wait > 0 ? `Resend in 0:${String(wait).padStart(2, "0")}` : "Resend code"}
          </Button>
        </div>
        <div className="enter enter-4 mt-auto flex flex-col gap-3">
          <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={code.length !== 6}>
            {busy ? "Checking…" : "Verify email"}
          </Button>
          <Button variant="ghost" size="lg" block onClick={() => setOpen(false)}>
            Do this later
          </Button>
          <p className="t-meta text-center" style={{ fontSize: 12 }}>
            You can use the app now. Confirm your email to keep syncing.
          </p>
        </div>
      </form>
    </Sheet>
  )
}
