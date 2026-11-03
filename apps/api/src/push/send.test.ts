import { describe, expect, it } from "vitest"
import { REMINDER_TTL_SECONDS, sendPush } from "./send"

async function makeKeys() {
  const vapid = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair
  const privateJwk = JSON.stringify(await crypto.subtle.exportKey("jwk", vapid.privateKey))
  // A browser subscription: its own P-256 key + 16-byte auth secret.
  const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair
  const p256dh = Buffer.from((await crypto.subtle.exportKey("raw", ua.publicKey)) as ArrayBuffer).toString("base64url")
  const auth = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url")
  return { privateJwk, p256dh, auth }
}

describe("sendPush", () => {
  it("sends an encrypted, VAPID-signed request with a 24 h TTL and prunes gone subscriptions", async () => {
    const { privateJwk, p256dh, auth } = await makeKeys()
    const calls: { url: string; headers: Headers; body: ArrayBuffer }[] = []
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers), body: init.body as unknown as ArrayBuffer })
      return new Response(null, { status: url.includes("gone") ? 410 : 201 })
    }) as unknown as typeof fetch

    const result = await sendPush(
      [
        { endpoint: "https://fcm.googleapis.com/fcm/send/live", p256dh, auth },
        { endpoint: "https://fcm.googleapis.com/fcm/send/gone", p256dh, auth },
      ],
      { title: "Pay bill", body: "Reminder · 4:00 pm", url: "/reminders/x", tag: "x" },
      { privateJwk, subject: "mailto:test@example.com" },
      fakeFetch,
    )

    expect(result).toEqual({ sent: 1, failed: 0, gone: ["https://fcm.googleapis.com/fcm/send/gone"] })
    const live = calls.find((c) => c.url.endsWith("/live"))!
    expect(live.headers.get("TTL")).toBe(String(REMINDER_TTL_SECONDS))
    expect(live.headers.get("Content-Encoding")).toBe("aes128gcm")
    expect(live.headers.get("Urgency")).toBe("high")
    expect(live.headers.get("Authorization")).toMatch(/^vapid t=.+, k=.+/)
    // The payload is encrypted: the title must not appear in the body bytes.
    expect(Buffer.from(live.body).toString("utf8")).not.toContain("Pay bill")
  })

  it("never throws when the push service is unreachable", async () => {
    const { privateJwk, p256dh, auth } = await makeKeys()
    const failing = (async () => {
      throw new TypeError("network down")
    }) as unknown as typeof fetch
    const result = await sendPush(
      [{ endpoint: "https://web.push.apple.com/abc", p256dh, auth }],
      { title: "t", body: "b", url: "/", tag: "t" },
      { privateJwk, subject: "mailto:test@example.com" },
      failing,
    )
    expect(result).toEqual({ sent: 0, failed: 1, gone: [] })
  })
})
