import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useSessionContext } from "../data/session"
import { AuthScreen, type AuthMode } from "../ui/auth/auth-screen"
import { hasOnboarded, markOnboarded } from "../ui/onboarding/onboarded-flag"
import { Onboarding } from "../ui/onboarding/onboarding"
import { AppShell } from "../ui/shell/app-shell"
import { SplashScreen } from "../ui/splash-screen"

/** Set by the session once this device has signed in (data is local from then on). */
const LAST_USER_KEY = "personal.user"
/** The splash recipe runs under 700ms; keep it up that long on a first launch. */
const SPLASH_MS = 700

function isReturnVisit(): boolean {
  try {
    return localStorage.getItem(LAST_USER_KEY) !== null
  } catch {
    return false
  }
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Every route renders inside this: splash, onboarding, sign-in, or the signed-in shell. */
export function RootLayout() {
  const { state } = useSessionContext()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Splash only on a first launch; return visits open local data straight away (motion.md "Splash").
  const [splashShown, setSplashShown] = useState(() => isReturnVisit() || reducedMotion())
  const [onboarded, setOnboarded] = useState(hasOnboarded)
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in")

  useEffect(() => {
    if (splashShown) return
    const t = window.setTimeout(() => setSplashShown(true), SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [splashShown])

  const showOnboarding = state.status === "signed-out" && splashShown && !onboarded
  useEffect(() => {
    if (showOnboarding && pathname !== "/welcome") void navigate({ to: "/welcome", replace: true })
  }, [showOnboarding, pathname, navigate])

  if (state.status === "loading" || !splashShown) return splashShown ? <div className="min-h-dvh bg-canvas" aria-busy="true" /> : <SplashScreen />
  if (state.status === "signed-out") {
    if (!onboarded || pathname === "/welcome") {
      return (
        <Onboarding
          onDone={(next) => {
            markOnboarded()
            setOnboarded(true)
            setAuthMode(next)
            if (pathname === "/welcome") void navigate({ to: "/", replace: true })
          }}
        />
      )
    }
    return <AuthScreen key={authMode} initialMode={authMode} />
  }
  return (
    <AppShell key={state.session.user.id}>
      <Outlet />
    </AppShell>
  )
}
