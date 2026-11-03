import { describe, expect, it } from "vitest"
import { b64urlDecode, b64urlEncode, encryptPayload, hkdf, vapidAuthorization } from "./web-push"

const enc = new TextEncoder()

/** What a browser does on receipt (RFC 8291), written independently of the sender. */
async function browserDecrypt(body: Uint8Array, ua: CryptoKeyPair, authSecret: Uint8Array): Promise<string> {
  const salt = body.subarray(0, 16)
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16)
  const idlen = body[20]!
  const asPublic = body.subarray(21, 21 + idlen)
  const ciphertext = body.subarray(21 + idlen)
  expect(rs).toBe(4096)
  const uaPublic = new Uint8Array((await crypto.subtle.exportKey("raw", ua.publicKey)) as ArrayBuffer)
  const asKey = await crypto.subtle.importKey("raw", asPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey } as never, ua.privateKey, 256))
  const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...uaPublic, ...asPublic])
  const ikm = await hkdf(authSecret, ecdh, info, 32)
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16)
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12)
  const key = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["decrypt"])
  const record = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, ciphertext as BufferSource))
  expect(record[record.length - 1]).toBe(2) // last-record delimiter
  return new TextDecoder().decode(record.subarray(0, record.length - 1))
}

describe("web push (RFC 8291 aes128gcm + RFC 8292 VAPID)", () => {
  it("a browser holding the subscription keys can decrypt the payload", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair
    const authSecret = crypto.getRandomValues(new Uint8Array(16))
    const sub = {
      p256dh: b64urlEncode(new Uint8Array((await crypto.subtle.exportKey("raw", ua.publicKey)) as ArrayBuffer)),
      auth: b64urlEncode(authSecret),
    }
    const message = JSON.stringify({ title: "Pay bill", body: "Reminder · 4:00 pm", tag: "occ-1" })
    const body = await encryptPayload(enc.encode(message), sub)
    expect(await browserDecrypt(body, ua, authSecret)).toBe(message)
  })

  it("signs a VAPID JWT for the push service origin that verifies with the public key", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair
    const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as JsonWebKey
    const now = Date.parse("2026-11-03T10:00:00Z")
    const header = await vapidAuthorization("https://web.push.apple.com/QGuQyavXutnMaz", jwk, "mailto:a@b.c", now)
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(m[2]!)))
    expect(claims).toEqual({ aud: "https://web.push.apple.com", exp: Math.floor(now / 1000) + 12 * 3600, sub: "mailto:a@b.c" })
    const pub = await crypto.subtle.importKey("raw", b64urlDecode(m[4]!) as BufferSource, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"])
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, b64urlDecode(m[3]!) as BufferSource, enc.encode(`${m[1]}.${m[2]}`))
    expect(ok).toBe(true)
  })
})
