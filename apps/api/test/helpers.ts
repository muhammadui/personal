import { createHash } from "node:crypto"
import type { PulledRecord } from "@personal/core"
import { createApp, type Hub, type PushSubscriptionInput } from "../src/app"
import { createAuth } from "../src/auth/auth"
import { createDb, type Db } from "../src/db/client"
import type { EmailMessage } from "../src/email"

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:54329/postgres"
export const APP_URL = "http://localhost:8787"
export const OWNER_URL = ADMIN_URL.replace(/\/[^/]+$/, "/personal_test")
export const APP_DB_URL = OWNER_URL.replace(/\/\/[^@]+@/, "//personal_app:personal_app@")

export class FakeHub implements Hub {
  pushes: { userId: string; deviceId: string; changed: PulledRecord[]; changedNoteIds: string[] }[] = []
  subs: { userId: string; input: PushSubscriptionInput }[] = []
  async afterPush(userId: string, info: { deviceId: string; changed: PulledRecord[]; changedNoteIds: string[] }) {
    this.pushes.push({ userId, ...info })
  }
  async subscribe(userId: string, input: PushSubscriptionInput) {
    this.subs.push({ userId, input })
  }
  async unsubscribe(userId: string, endpoint: string) {
    this.subs = this.subs.filter((s) => !(s.userId === userId && s.input.subscription.endpoint === endpoint))
  }
  wiped: string[] = []
  async wipe(userId: string) {
    this.wiped.push(userId)
  }
  async websocket(): Promise<Response> {
    return new Response("no websockets in tests", { status: 501 })
  }
}

/** Stand-in for the device-side Argon2id step: any 64-char hex string is a valid prehash. */
export function prehash(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

export type TestServer = ReturnType<typeof createTestServer>

export function createTestServer(opts: { allowedEmails?: string[]; rateLimit?: boolean } = {}) {
  const db: Db = createDb(APP_DB_URL, { max: 4 })
  const emails: EmailMessage[] = []
  const hub = new FakeHub()
  const deferred: Promise<unknown>[] = []
  const auth = createAuth(
    db,
    { send: async (m) => void emails.push(m) },
    {
      appUrl: APP_URL,
      secret: "test-secret-test-secret-test-secret-123",
      pepper: "test-pepper-test-pepper-test-pepper-123",
      allowedEmails: opts.allowedEmails ?? [],
      rateLimit: opts.rateLimit ?? false,
      onUserDeleted: (userId) => hub.wipe(userId),
    },
  )
  const app = createApp(() => ({ db, auth, hub, vapidPublicKey: "test-vapid", defer: (p) => void deferred.push(p) }))

  async function request(path: string, init: RequestInit & { cookie?: string } = {}) {
    const headers = new Headers(init.headers)
    if (init.cookie) headers.set("cookie", init.cookie)
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json")
    headers.set("origin", APP_URL)
    return app.request(`${APP_URL}${path}`, { ...init, headers })
  }

  /** Sign up (email must be allowlisted) and return the session cookie. */
  async function signUp(email: string, password = "correct horse battery") {
    const res = await request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email, password: prehash(password), name: email.split("@")[0] }),
    })
    return { res, cookie: cookieFrom(res), body: (await res.clone().json().catch(() => null)) as { user?: { id: string } } | null }
  }

  async function signIn(email: string, password = "correct horse battery") {
    const res = await request("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password: prehash(password) }),
    })
    return { res, cookie: cookieFrom(res) }
  }

  return { app, db, auth, emails, hub, deferred, request, signUp, signIn, close: () => db.sql.end() }
}

export function cookieFrom(res: Response): string {
  const all = res.headers.getSetCookie?.() ?? []
  return all
    .map((c) => c.split(";")[0])
    .filter((c): c is string => Boolean(c) && !c!.endsWith("="))
    .join("; ")
}

export function uniqueEmail(tag = "user"): string {
  return `${tag}-${crypto.randomUUID().slice(0, 8)}@example.com`
}
