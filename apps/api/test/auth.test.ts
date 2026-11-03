import { ids } from "@personal/core"
import { afterAll, describe, expect, it } from "vitest"
import { createTestServer, prehash, uniqueEmail } from "./helpers"

const allowed = Array.from({ length: 10 }, (_, i) => uniqueEmail(`a${i}`))
const server = createTestServer({ allowedEmails: allowed })
afterAll(() => server.close())

async function pullAll(cookie: string) {
  const res = await server.request("/api/sync/pull?since=0", { cookie })
  return (await res.json()) as { changes: { table: string; id: string; data: Record<string, unknown> }[] }
}

describe("auth", () => {
  it("lets an allowlisted email sign up and creates settings + Inbox", async () => {
    const email = allowed[0]!
    const { res, cookie, body } = await server.signUp(email)
    expect(res.status).toBe(200)
    expect(cookie).toContain("better-auth.session_token")
    const userId = body!.user!.id
    const { changes } = await pullAll(cookie)
    const settings = changes.find((c) => c.table === "settings")
    const inbox = changes.find((c) => c.table === "lists")
    expect(settings?.id).toBe(ids.settings(userId))
    expect(settings?.data.timezone).toBe("Africa/Lagos")
    expect(inbox?.id).toBe(ids.inbox(userId))
    expect(inbox?.data).toMatchObject({ name: "Inbox", is_inbox: true })
  })

  it("refuses sign-up for an email that is not on the allowlist", async () => {
    const { res } = await server.signUp(uniqueEmail("stranger"))
    expect(res.status).toBe(403)
    expect(((await res.json()) as { message: string }).message).toBe("Sign-up is closed on this server.")
  })

  it("refuses a raw password that was not stretched on the device", async () => {
    const res = await server.request("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ email: allowed[1], password: "short password", name: "x" }),
    })
    expect(res.status).toBe(400)
  })

  it("signs in with the right password and refuses the wrong one", async () => {
    const email = allowed[2]!
    await server.signUp(email, "right password")
    expect((await server.signIn(email, "right password")).res.status).toBe(200)
    expect((await server.signIn(email, "wrong password")).res.status).toBe(401)
  })

  it("stores only the peppered HMAC, never the prehash", async () => {
    const email = allowed[3]!
    await server.signUp(email, "secret words")
    const rows = await server.db.sql<{ password: string }[]>`
      SELECT a.password FROM account a JOIN "user" u ON u.id = a.user_id WHERE u.email = ${email}`
    expect(rows[0]?.password).toMatch(/^v1\$/)
    expect(rows[0]?.password).not.toContain(prehash("secret words"))
  })

  it("verifies the email with a 6-digit code sent by email", async () => {
    const email = allowed[4]!
    const { cookie } = await server.signUp(email)
    const sent = server.emails.filter((m) => m.to === email)
    expect(sent.length).toBeGreaterThan(0)
    const message = sent[sent.length - 1]!
    expect(message.subject).toMatch(/^\d{6} is your Personal verification code$/)
    expect(message.text).toContain("expires in 10 minutes")
    const otp = message.subject.slice(0, 6)
    const res = await server.request("/api/auth/email-otp/verify-email", {
      method: "POST",
      cookie,
      body: JSON.stringify({ email, otp }),
    })
    expect(res.status).toBe(200)
    const session = await server.request("/api/auth/get-session", { cookie: (res.headers.getSetCookie().length ? cookie : cookie) })
    expect(session.status).toBe(200)
    const rows = await server.db.sql<{ email_verified: boolean }[]>`SELECT email_verified FROM "user" WHERE email = ${email}`
    expect(rows[0]?.email_verified).toBe(true)
  })

  it("resets the password with an emailed code; the old password stops working and other sessions end", async () => {
    const email = allowed[5]!
    const { cookie: firstSession } = await server.signUp(email, "old password")
    const send = await server.request("/api/auth/email-otp/send-verification-otp", {
      method: "POST",
      body: JSON.stringify({ email, type: "forget-password" }),
    })
    expect(send.status).toBe(200)
    const message = server.emails.filter((m) => m.to === email && m.subject.includes("password reset")).pop()
    expect(message).toBeDefined()
    const otp = message!.subject.slice(0, 6)
    const reset = await server.request("/api/auth/email-otp/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, password: prehash("new password") }),
    })
    expect(reset.status).toBe(200)
    expect((await server.signIn(email, "old password")).res.status).toBe(401)
    expect((await server.signIn(email, "new password")).res.status).toBe(200)
    const pullWithOld = await server.request("/api/sync/pull?since=0", { cookie: firstSession.replace(/better-auth\.session_data=[^;]+;?\s*/, "") })
    expect(pullWithOld.status).toBe(401)
  })

  it("lists sessions (devices) and revokes one remotely", async () => {
    const email = allowed[6]!
    await server.signUp(email)
    const laptop = (await server.signIn(email)).cookie
    const phone = (await server.signIn(email)).cookie
    const list = await server.request("/api/auth/list-sessions", { cookie: laptop })
    const sessions = (await list.json()) as { token: string }[]
    expect(sessions.length).toBeGreaterThanOrEqual(3)
    const phoneToken = decodeURIComponent(/better-auth\.session_token=([^;]+)/.exec(phone)![1]!).split(".")[0]
    const revoke = await server.request("/api/auth/revoke-session", {
      method: "POST",
      cookie: laptop,
      body: JSON.stringify({ token: phoneToken }),
    })
    expect(revoke.status).toBe(200)
    const phoneNoCache = phone.replace(/better-auth\.session_data=[^;]+;?\s*/, "")
    expect((await server.request("/api/sync/pull?since=0", { cookie: phoneNoCache })).status).toBe(401)
    expect((await server.request("/api/sync/pull?since=0", { cookie: laptop })).status).toBe(200)
  })

  it("rejects sync calls without a session", async () => {
    expect((await server.request("/api/sync/pull?since=0")).status).toBe(401)
    expect((await server.request("/api/sync/push", { method: "POST", body: "{}" })).status).toBe(401)
  })
})

describe("account deletion", () => {
  it("deletes the account and every synced row, and wipes the user's hub", async () => {
    const email = allowed[7]!
    const { cookie, body } = await server.signUp(email, "delete me please")
    const userId = body!.user!.id
    const res = await server.request("/api/auth/delete-user", {
      method: "POST",
      cookie,
      body: JSON.stringify({ password: prehash("delete me please") }),
    })
    expect(res.status).toBe(200)
    const users = await server.db.sql`SELECT 1 FROM "user" WHERE id = ${userId}`
    expect(users.length).toBe(0)
    const rows = await server.db.sql.begin(async (tx) => {
      await tx`SELECT set_config('app.user_id', ${userId}, true)`
      return tx`SELECT 1 FROM records`
    })
    expect(rows.length).toBe(0)
    expect(server.hub.wiped).toContain(userId)
    expect((await server.signIn(email, "delete me please")).res.status).toBe(401)
  })
})
