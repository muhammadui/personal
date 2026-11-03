import { createApp, type Hub } from "./app"
import { createAuth, parseAllowedEmails } from "./auth/auth"
import { createDb } from "./db/client"
import { createEmailSender } from "./email"
import type { UserHub } from "./hub/user-hub"
import { purgeTombstones } from "./purge"

export { UserHub } from "./hub/user-hub"

export type WorkerEnv = {
  ASSETS: Fetcher
  HYPERDRIVE: Hyperdrive
  USER_HUB: DurableObjectNamespace<UserHub>
  APP_URL: string
  BETTER_AUTH_SECRET: string
  PASSWORD_PEPPER: string
  ALLOWED_EMAILS?: string
  RESEND_API_KEY?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_JWK?: string
  VAPID_SUBJECT?: string
  DEV_TRUSTED_ORIGINS?: string
}

function hubFor(env: WorkerEnv): Hub {
  const stub = (userId: string) => env.USER_HUB.get(env.USER_HUB.idFromName(userId))
  return {
    afterPush: (userId, info) => stub(userId).afterPush(info),
    subscribe: (userId, input) => stub(userId).subscribe(input),
    unsubscribe: (userId, endpoint) => stub(userId).unsubscribe(endpoint),
    websocket: (userId, request) => stub(userId).fetch(request),
    wipe: (userId) => stub(userId).wipe(),
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request)

    // One small client per request; Hyperdrive keeps the real connections warm.
    const db = createDb(env.HYPERDRIVE.connectionString, { max: 3 })
    const auth = createAuth(db, createEmailSender(env.RESEND_API_KEY), {
      appUrl: env.APP_URL,
      secret: env.BETTER_AUTH_SECRET,
      pepper: env.PASSWORD_PEPPER,
      allowedEmails: parseAllowedEmails(env.ALLOWED_EMAILS),
      trustedOrigins: env.DEV_TRUSTED_ORIGINS ? env.DEV_TRUSTED_ORIGINS.split(",") : [],
      onUserDeleted: (userId) => hubFor(env).wipe(userId),
    })
    const app = createApp(() => ({
      db,
      auth,
      hub: hubFor(env),
      vapidPublicKey: env.VAPID_PUBLIC_KEY,
      defer: (work) => ctx.waitUntil(work.catch((e: unknown) => console.error("deferred work failed:", e))),
    }))
    try {
      return await app.fetch(request, env, ctx)
    } finally {
      ctx.waitUntil(db.sql.end({ timeout: 5 }))
    }
  },

  async scheduled(_event: ScheduledController, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    const db = createDb(env.HYPERDRIVE.connectionString, { max: 1 })
    ctx.waitUntil(purgeTombstones(db.sql).finally(() => db.sql.end({ timeout: 5 })))
  },
} satisfies ExportedHandler<WorkerEnv>
