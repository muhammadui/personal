import { base64ToBytes, bytesToBase64 } from "@personal/core"

/**
 * Server half of password storage (docs/auth.md). The device already ran Argon2id, so the
 * value arriving here is a 64-char hex "prehash". We store HMAC-SHA256(pepper, salt || prehash)
 * with a random salt. Cheap enough for the Workers free plan's 10 ms CPU budget; useless to an
 * attacker who has the database but not the pepper (a Worker secret).
 */
const PREFIX = "v1"
const encoder = new TextEncoder()

async function hmacKey(pepper: string): Promise<CryptoKey> {
  if (pepper.length < 32) throw new Error("PASSWORD_PEPPER must be at least 32 characters")
  return crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

export function isPrehash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value)
}

export async function hashPassword(pepper: string, prehash: string): Promise<string> {
  if (!isPrehash(prehash)) throw new Error("Password must be stretched on the device first")
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(pepper), concat(salt, encoder.encode(prehash))))
  return `${PREFIX}$${bytesToBase64(salt)}$${bytesToBase64(mac)}`
}

export async function verifyPassword(pepper: string, stored: string, prehash: string): Promise<boolean> {
  const [prefix, saltB64, macB64] = stored.split("$")
  if (prefix !== PREFIX || !saltB64 || !macB64 || !isPrehash(prehash)) return false
  const salt = base64ToBytes(saltB64)
  const mac = base64ToBytes(macB64)
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify("HMAC", await hmacKey(pepper), mac as BufferSource, concat(salt, encoder.encode(prehash)) as BufferSource)
}
