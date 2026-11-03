/**
 * Generate a VAPID key pair once (docs/reminders.md).
 *   VAPID_PRIVATE_JWK  -> Worker secret (JSON)
 *   VAPID_PUBLIC_KEY   -> Worker var, served to the app for PushManager.subscribe
 */
const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey)
const raw = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer)
const publicKey = Buffer.from(raw).toString("base64url")
console.log(`VAPID_PUBLIC_KEY=${publicKey}`)
console.log(`VAPID_PRIVATE_JWK=${JSON.stringify(privateJwk)}`)

export {}
