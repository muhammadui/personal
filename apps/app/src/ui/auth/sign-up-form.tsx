import { Button, Field, PasswordInput, TextInput } from "@personal/ui"
import { useState, type FormEvent } from "react"
import { useSessionContext } from "../../data/session"
import { signUp } from "../../lib/auth-client"
import { MIN_PASSWORD_LENGTH } from "../../lib/password"
import { markJustSignedUp } from "./signup-flag"

type Props = { email: string; onEmailChange: (email: string) => void; onSignIn: () => void }

/** Signup.dc.html. After success the app opens on "Check your email". */
export function SignUpForm({ email, onEmailChange, onSignIn }: Props) {
  const { startSession } = useSessionContext()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPwError(`Use ${MIN_PASSWORD_LENGTH} or more characters.`)
      return
    }
    setPwError(null)
    setBusy(true)
    setError(null)
    const result = await signUp(name.trim(), email.trim(), password)
    if (!result.ok) {
      setBusy(false)
      setError(result.message)
      return
    }
    markJustSignedUp()
    await startSession(result.user)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-1 flex-col gap-5" noValidate>
      <div className="enter flex flex-col gap-1.5">
        <h1 className="t-title1">Create your account</h1>
        <p className="t-body" style={{ color: "var(--ink-muted)" }}>
          One account for your phone, laptop and browser.
        </p>
      </div>
      <Field label="Your name" htmlFor="signup-name" className="enter enter-1">
        <TextInput id="signup-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email" htmlFor="signup-email" className="enter enter-2">
        <TextInput id="signup-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="signup-password" hint={`Use ${MIN_PASSWORD_LENGTH} or more characters. A short sentence works well.`} error={pwError} className="enter enter-3">
        <PasswordInput id="signup-password" autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} invalid={Boolean(pwError)} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <div className="enter enter-4 mt-auto flex flex-col gap-3.5 lg:mt-0">
        <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={!name.trim() || !email.trim() || !password}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="t-meta text-center">
          Already have an account?{" "}
          <button type="button" onClick={onSignIn} className="border-0 bg-transparent p-0" style={{ fontWeight: 800, color: "var(--text-accent)", minHeight: 44 }}>
            Sign in
          </button>
        </p>
      </div>
    </form>
  )
}
