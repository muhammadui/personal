import { Banner, Button, CodeInput, Field, PasswordInput, TextInput } from "@personal/ui"
import { Info, KeyRound, Mail } from "lucide-react"
import { useState, type FormEvent } from "react"
import { resetPassword, sendCode } from "../../lib/auth-client"
import { MIN_PASSWORD_LENGTH } from "../../lib/password"

type Props = { email: string; onEmailChange: (email: string) => void; onDone: () => void; onCancel: () => void }

/** ForgotPassword.dc.html, using a 6-digit code instead of a link (that is how the server resets). */
export function ForgotPasswordForm({ email, onEmailChange, onDone, onCancel }: Props) {
  const [step, setStep] = useState<"email" | "code">("email")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    const result = await sendCode(email.trim(), "forget-password")
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setStep("code")
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use ${MIN_PASSWORD_LENGTH} or more characters.`)
      return
    }
    setBusy(true)
    setError(null)
    const result = await resetPassword(email.trim(), code, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onDone()
  }

  if (step === "email") {
    return (
      <form onSubmit={(e) => void requestCode(e)} className="flex flex-1 flex-col gap-5" noValidate>
        <span className="tile tile-lg tile-accent enter">
          <KeyRound size={24} strokeWidth={2} aria-hidden />
        </span>
        <div className="enter enter-1 flex flex-col gap-2">
          <h1 className="t-title1">Reset your password</h1>
          <p className="t-body" style={{ color: "var(--ink-muted)" }}>
            Enter your account email. We'll send a 6-digit code.
          </p>
        </div>
        <Field label="Email" htmlFor="forgot-email" error={error} className="enter enter-2">
          <TextInput id="forgot-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => onEmailChange(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={!email.trim()} className="enter enter-3">
          {busy ? "Sending…" : "Send code"}
        </Button>
        <Button variant="ghost" size="lg" block onClick={onCancel} className="hidden lg:inline-flex">
          Back to sign in
        </Button>
        <p className="t-meta enter enter-4 mt-auto text-center lg:mt-0" style={{ fontSize: 12 }}>
          Resetting your password signs you out on your other devices. Notes on this device stay safe.
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={(e) => void reset(e)} className="flex flex-1 flex-col gap-5" noValidate>
      <span className="tile tile-lg tile-success enter" style={{ animation: "p-pop var(--dur-slow) var(--ease-spring) both" }}>
        <Mail size={24} strokeWidth={2} aria-hidden />
      </span>
      <div className="enter enter-1 flex flex-col gap-2">
        <h1 className="t-title1">Check your email</h1>
        <p className="t-body" style={{ color: "var(--ink-muted)" }}>
          If an account exists for <strong style={{ color: "var(--ink)" }}>{email.trim()}</strong>, a code is on its way.
        </p>
      </div>
      <Field label="Code" htmlFor="forgot-code" className="enter enter-2">
        <CodeInput id="forgot-code" value={code} onChange={setCode} autoFocus />
      </Field>
      <Field label="New password" htmlFor="forgot-password" hint={`Use ${MIN_PASSWORD_LENGTH} or more characters.`} error={error} className="enter enter-3">
        <PasswordInput id="forgot-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Banner tone="info" icon={<Info aria-hidden />}>
        <span style={{ fontWeight: 600 }}>The code expires in 10 minutes and works once.</span>
      </Banner>
      <div className="enter enter-4 mt-auto flex flex-col gap-2.5 lg:mt-0">
        <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={code.length !== 6 || !password}>
          {busy ? "Saving…" : "Set new password"}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          block
          onClick={() => {
            setCode("")
            setStep("email")
          }}
        >
          Use a different email
        </Button>
      </div>
    </form>
  )
}
