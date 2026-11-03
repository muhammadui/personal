/**
 * Web Push request builder using only WebCrypto, so it runs on Cloudflare Workers.
 *  - Payload encryption: RFC 8291 "aes128gcm" (the encoding Apple, Google and Mozilla accept;
 *    the same default the `web-push` library uses in the owner's Chop app).
 *  - Authentication: VAPID, RFC 8292 (ES256 JWT).
 */
const enc = new TextEncoder()

export type Subscription = { endpoint: string; p256dh: string; auth: string }
export type WebPushOptions = { ttl: number; urgency?: "very-low" | "low" | "normal" | "high"; topic?: string }

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function b64urlDecode(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** HKDF-SHA256 (extract + expand) via WebCrypto. */
export async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource }, key, length * 8)
  return new Uint8Array(bits)
}

/** RFC 8291 §3–4: encrypt `plaintext` for one subscription. Returns the aes128gcm body. */
export async function encryptPayload(
  plaintext: Uint8Array,
  sub: { p256dh: string; auth: string },
  // Injected only by tests; normally random per message.
  fixed?: { salt: Uint8Array; serverKeys: CryptoKeyPair },
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(sub.p256dh)
  const authSecret = b64urlDecode(sub.auth)
  const serverKeys = fixed?.serverKeys ?? ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair)
  const asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", serverKeys.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey } as never, serverKeys.privateKey, 256))

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32)
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16)
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12)

  // Single record: plaintext followed by the 0x02 "last record" delimiter, no extra padding.
  const record = concat(plaintext, new Uint8Array([2]))
  const key = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, record as BufferSource))

  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, ciphertext)
}

/** RFC 8292: `Authorization: vapid t=<JWT>, k=<public key>` for the push service origin. */
export async function vapidAuthorization(endpoint: string, privateJwk: JsonWebKey, subject: string, now = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const payload = b64urlEncode(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })))
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${payload}`)))
  const publicKey = concat(new Uint8Array([4]), b64urlDecode(privateJwk.x!), b64urlDecode(privateJwk.y!))
  return `vapid t=${header}.${payload}.${b64urlEncode(signature)}, k=${b64urlEncode(publicKey)}`
}

export async function buildPushRequest(
  sub: Subscription,
  payload: unknown,
  vapid: { privateJwk: JsonWebKey; subject: string },
  opts: WebPushOptions,
): Promise<{ url: string; init: RequestInit }> {
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), sub)
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization(sub.endpoint, vapid.privateJwk, vapid.subject),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(opts.ttl),
    Urgency: opts.urgency ?? "normal",
  }
  if (opts.topic) headers.Topic = opts.topic
  return { url: sub.endpoint, init: { method: "POST", headers, body: body as BodyInit } }
}
