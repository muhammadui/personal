import type { PulledRecord } from "@personal/core"
import { Hono, type Context } from "hono"
import { z } from "zod"
import type { Auth } from "./auth/auth"
import type { Db } from "./db/client"
import { applyPush } from "./sync/push"
import { parsePullQuery, pull } from "./sync/pull"

export const pushSubscriptionSchema = z.strictObject({
  deviceId: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
  subscription: z.object({
    endpoint: z.url().startsWith("https://"),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
})
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>

/** What the API needs from the per-user Durable Object. Faked in tests. */
export interface Hub {
  afterPush(userId: string, info: { deviceId: string; changed: PulledRecord[]; changedNoteIds: string[] }): Promise<void>
  subscribe(userId: string, input: PushSubscriptionInput): Promise<void>
  unsubscribe(userId: string, endpoint: string): Promise<void>
  websocket(userId: string, request: Request): Promise<Response>
  wipe(userId: string): Promise<void>
}

export type Deps = {
  db: Db
  auth: Auth
  hub: Hub
  vapidPublicKey: string | undefined
  /** Keep work alive after the response (ctx.waitUntil on Workers). */
  defer: (work: Promise<unknown>) => void
}

type Env = { Variables: { deps: Deps; userId: string } }

export function createApp(makeDeps: (c: Context) => Deps | Promise<Deps>) {
  const app = new Hono<Env>().basePath("/api")

  app.use("*", async (c, next) => {
    c.set("deps", await makeDeps(c))
    await next()
  })

  app.get("/health", (c) => c.json({ ok: true }))

  app.on(["GET", "POST"], "/auth/*", (c) => c.get("deps").auth.handler(c.req.raw))

  const requireUser = async (c: Context<Env>, next: () => Promise<void>) => {
    const session = await c.get("deps").auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: "unauthorized", message: "Sign in again." }, 401)
    c.set("userId", session.user.id)
    await next()
  }
  app.use("/sync/*", requireUser)
  app.use("/push/subscribe", requireUser)
  app.use("/push/unsubscribe", requireUser)
  app.use("/ws", requireUser)

  app.post("/sync/push", async (c) => {
    const body = await c.req.json().catch(() => null)
    const { db, hub, defer } = c.get("deps")
    const userId = c.get("userId")
    const result = await applyPush(db.sql, userId, body)
    if (!result.ok) return c.json({ error: "invalid", message: result.message }, 400)
    const deviceId = (body as { deviceId: string }).deviceId
    if (result.changed.length > 0 || result.changedNoteIds.length > 0) {
      defer(hub.afterPush(userId, { deviceId, changed: result.changed, changedNoteIds: result.changedNoteIds }))
    }
    return c.json(result.response)
  })

  app.get("/sync/pull", async (c) => {
    const q = parsePullQuery(c.req.query("since"), c.req.query("limit"))
    if (!q) return c.json({ error: "invalid", message: "since and limit must be non-negative integers" }, 400)
    return c.json(await pull(c.get("deps").db.sql, c.get("userId"), q.since, q.limit))
  })

  app.get("/push/vapid-public-key", (c) => {
    const key = c.get("deps").vapidPublicKey
    return key ? c.json({ key }) : c.json({ error: "unavailable", message: "Push is not configured." }, 503)
  })

  app.post("/push/subscribe", async (c) => {
    const parsed = pushSubscriptionSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid" }, 400)
    await c.get("deps").hub.subscribe(c.get("userId"), parsed.data)
    return c.json({ ok: true })
  })

  app.post("/push/unsubscribe", async (c) => {
    const parsed = z.object({ endpoint: z.url() }).safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: "invalid", message: "endpoint required" }, 400)
    await c.get("deps").hub.unsubscribe(c.get("userId"), parsed.data.endpoint)
    return c.json({ ok: true })
  })

  app.get("/ws", (c) => {
    if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") return c.json({ error: "upgrade_required" }, 426)
    return c.get("deps").hub.websocket(c.get("userId"), c.req.raw)
  })

  app.notFound((c) => c.json({ error: "not_found" }, 404))
  app.onError((e, c) => {
    console.error(e)
    return c.json({ error: "server_error", message: "Something went wrong." }, 500)
  })

  return app
}
