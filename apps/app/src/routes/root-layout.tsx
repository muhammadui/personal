import { Outlet } from "@tanstack/react-router"
import { useSessionContext } from "../data/session"
import { AuthScreen } from "../ui/auth/auth-screen"
import { LoadingScreen } from "../ui/loading-screen"
import { AppShell } from "../ui/shell/app-shell"

/** Every route renders inside this: loading, sign-in, or the signed-in shell. */
export function RootLayout() {
  const { state } = useSessionContext()
  if (state.status === "loading") return <LoadingScreen />
  if (state.status === "signed-out") return <AuthScreen />
  return (
    <AppShell key={state.session.user.id}>
      <Outlet />
    </AppShell>
  )
}
