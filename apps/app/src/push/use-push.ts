import { useCallback, useEffect, useState } from "react"
import { useSession } from "../data/session"

/**
 * Native Web Push (VAPID) registration, modelled on the owner's Chop app
 * (`hooks/use-push-notifications.ts`):
 *  1. uses the registered service worker,
 *  2. requests permission only from an explicit user action,
 *  3. subscribes via PushManager with the VAPID public key from the server,
 *  4. saves the subscription for this device (POST /api/push/subscribe).
 * Best-effort: unsupported browser, denied permission or a failed save never break the app.
 *
 * iPhone: Web Push works only in the installed PWA (Add to Home Screen, iOS 16.4+). In a
 * plain Safari tab PushManager is missing and the status is "unsupported".
 */
export type PushStatus = "checking" | "ready" | "subscribed" | "denied" | "unsupported" | "unavailable" | "error"

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

async function vapidKey(): Promise<string | null> {
  const res = await fetch("/api/push/vapid-public-key", { credentials: "same-origin" })
  if (!res.ok) return null
  return ((await res.json()) as { key?: string }).key ?? null
}

async function save(subscription: PushSubscription, deviceId: string): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, subscription: subscription.toJSON() }),
  })
  if (!res.ok) throw new Error(`Push subscription save failed: ${res.status}`)
}

export function usePushNotifications(): { status: PushStatus; enable: () => Promise<boolean> } {
  const { store } = useSession()
  const [status, setStatus] = useState<PushStatus>("checking")

  const enable = useCallback(async () => {
    if (!supported()) {
      setStatus("unsupported")
      return false
    }
    try {
      const key = await vapidKey()
      if (!key) {
        setStatus("unavailable")
        return false
      }
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission
      if (permission !== "granted") {
        setStatus("denied")
        return false
      }
      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }))
      await save(subscription, store.deviceId)
      setStatus("subscribed")
      return true
    } catch (e) {
      console.error("Push enable failed", e)
      setStatus("error")
      return false
    }
  }, [store.deviceId])

  // On load: re-save an existing subscription (it can rotate) when permission is already granted.
  useEffect(() => {
    if (!supported()) {
      setStatus("unsupported")
      return
    }
    let cancelled = false
    void (async () => {
      try {
        if (Notification.permission !== "granted") {
          setStatus(Notification.permission === "denied" ? "denied" : "ready")
          return
        }
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (cancelled) return
        if (!subscription) {
          setStatus("ready")
          return
        }
        await save(subscription, store.deviceId)
        if (!cancelled) setStatus("subscribed")
      } catch (e) {
        console.error("Push restore failed", e)
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [store.deviceId])

  return { status, enable }
}

/** Convert a base64url VAPID public key to the bytes PushManager wants. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
