import { buildPushHTTPRequest } from "@pushforge/builder"

/**
 * Web Push sender (WebCrypto, runs on Workers). Mirrors the owner's Chop app
 * (`lib/push/send.ts`): best-effort, prunes dead subscriptions on 404/410, never throws.
 */
export type StoredSubscription = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { title: string; body: string; url: string; tag: string }
export type SendResult = { sent: number; failed: number; gone: string[] }

/** 24 h: a phone that was offline or asleep still gets the reminder when it comes back. */
export const REMINDER_TTL_SECONDS = 24 * 60 * 60

export async function sendPush(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
  vapid: { privateJwk: string; subject: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, gone: [] }
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const req = await buildPushHTTPRequest({
          privateJWK: vapid.privateJwk,
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message: {
            payload,
            adminContact: vapid.subject,
            options: { ttl: REMINDER_TTL_SECONDS, urgency: "high" },
          },
        })
        const res = await fetchImpl(req.endpoint, { method: "POST", headers: req.headers, body: req.body })
        if (res.status === 404 || res.status === 410) result.gone.push(sub.endpoint)
        else if (res.ok) result.sent += 1
        else {
          result.failed += 1
          console.error(`push failed: ${res.status} ${await res.text().catch(() => "")}`)
        }
      } catch (e) {
        result.failed += 1
        console.error("push failed:", e)
      }
    }),
  )
  return result
}
