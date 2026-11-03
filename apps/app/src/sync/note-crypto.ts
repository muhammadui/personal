import { base64ToBytes, bytesToBase64 } from "@personal/core"
import { argon2id } from "hash-wasm"

/**
 * Locked-note encryption (docs/security.md): PIN or password → Argon2id with a per-note salt →
 * AES-256-GCM over every Yjs update before it is stored or synced. The server and the local
 * outbox only ever hold ciphertext for a locked note; the key lives in memory while unlocked.
 */
const MAGIC = new Uint8Array([0x00, 0xe5, 0x4c, 0x01]) // marks an encrypted update (v1)
const CHECK_TEXT = "personal-note-lock-check-v1"

export function newSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function deriveNoteKey(secret: string, saltB64: string): Promise<CryptoKey> {
  const raw = await argon2id({
    password: secret.normalize("NFKC"),
    salt: base64ToBytes(saltB64),
    parallelism: 1,
    iterations: 3,
    memorySize: 65_536,
    hashLength: 32,
    outputType: "binary",
  })
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

export function isEncrypted(bytes: Uint8Array): boolean {
  return bytes.length > MAGIC.length + 12 && MAGIC.every((b, i) => bytes[i] === b)
}

export async function encryptBytes(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain as BufferSource))
  const out = new Uint8Array(MAGIC.length + iv.length + ct.length)
  out.set(MAGIC, 0)
  out.set(iv, MAGIC.length)
  out.set(ct, MAGIC.length + iv.length)
  return out
}

export class WrongPinError extends Error {
  override name = "WrongPinError"
}

export async function decryptBytes(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  if (!isEncrypted(data)) throw new Error("Not an encrypted update")
  const iv = data.subarray(MAGIC.length, MAGIC.length + 12)
  const ct = data.subarray(MAGIC.length + 12)
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource))
  } catch {
    throw new WrongPinError("Wrong PIN or damaged note")
  }
}

/** The value stored as `lock_check`, used to tell a wrong PIN apart before opening the note. */
export async function makeLockCheck(key: CryptoKey): Promise<string> {
  return bytesToBase64(await encryptBytes(key, new TextEncoder().encode(CHECK_TEXT)))
}

export async function verifyLockCheck(key: CryptoKey, check: string): Promise<boolean> {
  try {
    const plain = await decryptBytes(key, base64ToBytes(check))
    return new TextDecoder().decode(plain) === CHECK_TEXT
  } catch {
    return false
  }
}
