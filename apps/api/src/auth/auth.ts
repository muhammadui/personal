import { ids, newId, serializeHlc, type Mutation } from "@personal/core"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { emailOTP } from "better-auth/plugins"
import type { Db } from "../db/client"
import { authSchema } from "../db/schema"
import { otpEmail, type EmailSender } from "../email"
import { applyPush } from "../sync/push"
import { hashPassword, verifyPassword } from "./password"

export type AuthConfig = {
  appUrl: string
  secret: string
  pepper: string
  allowedEmails: string[]
  trustedOrigins?: string[]
  rateLimit?: boolean
}

export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Settings and Inbox for a new account, written as ordinary synced records. */
export function initialRecords(userId: string, now = new Date()): Mutation[] {
  const iso = now.toISOString()
  const hlc = serializeHlc({ wall: now.getTime(), counter: 0, deviceId: "server" })
  return [
    {
      id: newId(),
      table: "settings",
      recordId: ids.settings(userId),
      op: "upsert",
      hlc,
      fields: {
        created_at: iso,
        updated_at: iso,
        theme: "system",
        timezone: "Africa/Lagos",
        default_reminder_time: "09:00",
        week_start: 1,
      },
    },
    {
      id: newId(),
      table: "lists",
      recordId: ids.inbox(userId),
      op: "upsert",
      hlc,
      fields: { created_at: iso, updated_at: iso, name: "Inbox", sort_order: 0, is_inbox: true },
    },
  ]
}

export function createAuth(db: Db, email: EmailSender, config: AuthConfig) {
  const allowed = new Set(config.allowedEmails)
  return betterAuth({
    appName: "Personal",
    baseURL: config.appUrl,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: [config.appUrl, ...(config.trustedOrigins ?? [])],
    database: drizzleAdapter(db.db, { provider: "pg", schema: authSchema }),
    advanced: {
      database: { generateId: () => newId() },
      // Same-origin app: Lax keeps the cookie on top-level navigations and all API calls.
      defaultCookieAttributes: { sameSite: "lax" },
    },
    emailAndPassword: {
      enabled: true,
      // The device always sends a 64-char hex Argon2id prehash, never the password itself.
      minPasswordLength: 64,
      maxPasswordLength: 64,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (prehash) => hashPassword(config.pepper, prehash),
        verify: ({ hash, password }) => verifyPassword(config.pepper, hash, password),
      },
    },
    session: {
      expiresIn: 60 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: config.rateLimit ?? true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 5 },
        "/sign-up/email": { window: 60 * 60, max: 10 },
        "/email-otp/send-verification-otp": { window: 15 * 60, max: 5 },
        "/email-otp/reset-password": { window: 15 * 60, max: 5 },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email: to, otp, type }) {
          await email.send(otpEmail(to, otp, type, config.appUrl))
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (!allowed.has(user.email.toLowerCase())) {
              throw new APIError("FORBIDDEN", { message: "Sign-up is closed on this server." })
            }
            return { data: user }
          },
          async after(user) {
            const result = await applyPush(db.sql, user.id, {
              deviceId: "server",
              mutations: initialRecords(user.id),
              docUpdates: [],
            })
            if (!result.ok || result.response.rejected.length > 0) {
              throw new Error(`Could not create initial records for ${user.id}`)
            }
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
