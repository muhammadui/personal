import { IconButton } from "@personal/ui"
import { ChevronLeft } from "lucide-react"
import { useState } from "react"
import { AuthAside } from "./auth-aside"
import { ForgotPasswordForm } from "./forgot-password-form"
import { SignInForm } from "./sign-in-form"
import { SignUpForm } from "./sign-up-form"

type Mode = "sign-in" | "sign-up" | "forgot"

/** Signin / Signup / ForgotPassword. From 1024px the navy panel (AuthDesktop) sits on the left. */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("sign-in")
  const [email, setEmail] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const go = (next: Mode, message: string | null = null) => {
    setNotice(message)
    setMode(next)
  }

  return (
    <div className="flex min-h-dvh flex-wrap bg-surface">
      <AuthAside />
      <section className="flex min-h-dvh min-w-0 flex-[1_1_520px] flex-col lg:items-center lg:justify-center lg:px-6 lg:py-12">
        <div className="flex w-full max-w-[440px] flex-1 flex-col self-center lg:flex-none lg:max-w-[400px]">
          <div className="px-3 pt-[calc(env(safe-area-inset-top)+8px)] lg:hidden" style={{ minHeight: 52 }}>
            {mode !== "sign-in" ? (
              <IconButton plain large label="Back" onClick={() => go("sign-in")}>
                <ChevronLeft size={24} strokeWidth={2} aria-hidden />
              </IconButton>
            ) : null}
          </div>
          <div key={mode} className="flex flex-1 flex-col px-6 pt-3 pb-8 lg:px-0 lg:pb-0">
            {mode === "sign-in" ? (
              <SignInForm email={email} onEmailChange={setEmail} notice={notice} onForgot={() => go("forgot")} onCreateAccount={() => go("sign-up")} />
            ) : mode === "sign-up" ? (
              <SignUpForm email={email} onEmailChange={setEmail} onSignIn={() => go("sign-in")} />
            ) : (
              <ForgotPasswordForm email={email} onEmailChange={setEmail} onDone={() => go("sign-in", "Password changed. Sign in with your new password.")} onCancel={() => go("sign-in")} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
