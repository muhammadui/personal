import { Banner, Button, Field, PasswordInput, TextInput } from "@personal/ui"
import { CircleCheck, Info } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useSessionContext } from "../../data/session"
import { signIn } from "../../lib/auth-client"
import { BrandMark } from "../brand-mark"

type Props = {
  email: string
  onEmailChange: (email: string) => void
  notice: string | null
  onForgot: () => void
  onCreateAccount: () => void
}

/** Signin.dc.html (phone) and the form half of AuthDesktop.dc.html. */
export function SignInForm({ email, onEmailChange, notice, onForgot, onCreateAccount }: Props) {
  const { startSession } = useSessionContext()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await signIn(email.trim(), password)
    if (!result.ok) {
      setBusy(false)
      setError(result.message)
      return
    }
    await startSession(result.user)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-1 flex-col gap-5" noValidate>
      <div className="enter flex flex-col gap-4">
        <span className="lg:hidden">
          <BrandMark size={44} wordmark={false} />
        </span>
        <h1 className="t-title1">
          <span className="lg:hidden">Welcome back</span>
          <span className="hidden lg:inline">Sign in</span>
        </h1>
        <p className="t-body" style={{ color: "var(--ink-muted)", marginTop: -10 }}>
          Sign in to sync your notes and tasks to this device.
        </p>
      </div>
      {notice ? <Banner tone="success" icon={<CircleCheck aria-hidden />}>{notice}</Banner> : null}
      <Field label="Email" htmlFor="signin-email" className="enter enter-1">
        <TextInput id="signin-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      </Field>
      <Field
        label="Password"
        htmlFor="signin-password"
        error={error}
        className="enter enter-2"
        aside={
          <button type="button" onClick={onForgot} className="border-0 bg-transparent p-0" style={{ font: "700 13px/18px var(--font-sans)", color: "var(--text-accent)" }}>
            Forgot password?
          </button>
        }
      >
        <PasswordInput id="signin-password" autoComplete="current-password" invalid={Boolean(error)} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" size="xl" block busy={busy} disabled={!email.trim() || !password} className="enter enter-3">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <Banner tone="info" icon={<Info aria-hidden />} className="enter enter-4 mt-auto lg:mt-0">
        <span style={{ fontWeight: 600 }}>Your notes download to this device after sign-in, so they keep working offline.</span>
      </Banner>
      <p className="t-meta text-center">
        New to Personal?{" "}
        <button type="button" onClick={onCreateAccount} className="border-0 bg-transparent p-0" style={{ fontWeight: 800, color: "var(--text-accent)", minHeight: 44 }}>
          Create an account
        </button>
      </p>
    </form>
  )
}
