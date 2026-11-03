import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"
import { prehashPassword } from "./password"

/** Better Auth client. Same origin as the app, so cookies are first-party. */
export const authClient = createAuthClient({
  baseURL: typeof location === "undefined" ? "http://localhost" : location.origin,
  basePath: "/api/auth",
  plugins: [emailOTPClient()],
})

export type AuthUser = { id: string; email: string; name: string; emailVerified: boolean }
type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string }

function message(error: { message?: string; status?: number } | null | undefined, fallback: string): string {
  if (!error) return fallback
  if (error.status === 429) return "Too many attempts. Wait a few minutes and try again."
  return error.message || fallback
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  const { data, error } = await authClient.signUp.email({ name, email, password: await prehashPassword(email, password) })
  if (error || !data) return { ok: false, message: message(error, "Could not create the account.") }
  return { ok: true, user: data.user as AuthUser }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await authClient.signIn.email({ email, password: await prehashPassword(email, password) })
  if (error || !data) {
    return { ok: false, message: error?.status === 401 ? "Wrong email or password." : message(error, "Could not sign in.") }
  }
  return { ok: true, user: data.user as AuthUser }
}

export async function sendCode(email: string, type: "email-verification" | "forget-password") {
  const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type })
  return error ? { ok: false as const, message: message(error, "Could not send the code.") } : { ok: true as const }
}

export async function verifyEmail(email: string, otp: string) {
  const { error } = await authClient.emailOtp.verifyEmail({ email, otp })
  return error ? { ok: false as const, message: message(error, "That code is wrong or has expired.") } : { ok: true as const }
}

export async function resetPassword(email: string, otp: string, password: string) {
  const { error } = await authClient.emailOtp.resetPassword({ email, otp, password: await prehashPassword(email, password) })
  return error ? { ok: false as const, message: message(error, "That code is wrong or has expired.") } : { ok: true as const }
}

export async function currentUser(): Promise<AuthUser | null | "offline"> {
  try {
    const { data, error } = await authClient.getSession()
    if (error) return error.status ? null : "offline"
    return (data?.user as AuthUser | undefined) ?? null
  } catch {
    return "offline"
  }
}
