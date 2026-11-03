import { Navigate } from "@tanstack/react-router"

/** /welcome while signed in: onboarding is only for the first launch, so go to Today. */
export function WelcomePage() {
  return <Navigate to="/" replace />
}
