import { argon2id } from "hash-wasm"

/**
 * Device half of password storage (docs/auth.md). The password never leaves the device:
 * we send Argon2id(password, salt = SHA-256("personal:" + email)) as 64 hex chars.
 * Parameters follow OWASP's minimum for Argon2id (19 MiB, 2 passes).
 */
export async function prehashPassword(email: string, password: string): Promise<string> {
  const saltSource = new TextEncoder().encode(`personal:${email.trim().toLowerCase()}`)
  const salt = new Uint8Array(await crypto.subtle.digest("SHA-256", saltSource))
  return argon2id({
    password: password.normalize("NFKC"),
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19_456,
    hashLength: 32,
    outputType: "hex",
  })
}

export const MIN_PASSWORD_LENGTH = 8
