/// <reference lib="webworker" />
/**
 * Personal service worker.
 * 1. Offline app shell: precache the built app; every navigation falls back to index.html.
 * 2. Web Push, as in the owner's Chop app (public/sw.js): show { title, body, url, tag },
 *    focus an open window on click or open one. The tag is the reminder occurrence id, so a
 *    duplicate (local + server) replaces instead of stacking.
 */
import { clientsClaim } from "workbox-core"
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api\//] }))

type PushData = { title?: string; body?: string; url?: string; tag?: string }

/** Reminder vibration (Android). iPhone uses the system's own notification haptics. Matches REMINDER_VIBRATION in ui/haptics.ts. */
const VIBRATE = [200, 120, 200, 120, 200]

self.addEventListener("push", (event) => {
  let data: PushData
  try {
    data = event.data ? (event.data.json() as PushData) : {}
  } catch {
    data = { title: "Personal", body: event.data ? event.data.text() : "" }
  }
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: data.body ?? "",
    vibrate: VIBRATE,
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url ?? "/" },
  }
  event.waitUntil(self.registration.showNotification(data.title ?? "Personal", options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          await (client as WindowClient).navigate(target).catch(() => undefined)
          return (client as WindowClient).focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})

/** The page asks the worker to show a local reminder (tab hidden) with the same tag as the push. */
self.addEventListener("message", (event) => {
  const msg = event.data as { type?: string; title?: string; body?: string; url?: string; tag?: string } | undefined
  if (msg?.type !== "show-reminder") return
  event.waitUntil(
    self.registration.showNotification(msg.title ?? "Personal", {
      body: msg.body ?? "",
      vibrate: VIBRATE,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: msg.tag,
      data: { url: msg.url ?? "/" },
    } as NotificationOptions & { vibrate?: number[] }),
  )
})
