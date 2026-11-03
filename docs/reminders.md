# Reminders and notifications

Every reminder fires through two channels: the device's own scheduler (works offline, app open) and the server's `UserHub` Durable Object, which sends Web Push at the due time (works with the app closed and the phone locked). Both use the same deterministic occurrence ID as the notification `tag`, so the user sees one alert.

Push works exactly like the owner's Chop app (`../chop/frontend`: `public/sw.js`, `hooks/use-push-notifications.ts`, `lib/push/send.ts`).

## Flow
1. Reminder saved → synced like any record. The push handler forwards changed `reminders` and `reminder_occurrences` rows to the user's `UserHub`.
2. `UserHub` keeps the user's schedule in its own SQLite storage and sets one alarm for the earliest due, unacknowledged occurrence.
3. When the alarm fires, `UserHub` sends a Web Push to each of the user's subscriptions with `tag` = occurrence ID and TTL 24 hours, then sets the next alarm (next reminder, or next recurrence).
4. If the phone is offline or asleep, the push service (Apple/Google) holds the message and delivers it when the phone is back, within the TTL. Older ones show in the app as "Missed at <time>".
5. Device channel: while the app is open, the local scheduler sets timers for occurrences due in the next 24 hours. When one fires, the app shows it in the bell and, if the tab is hidden, as a system notification with the same `tag` (a duplicate replaces, never stacks).
6. Done / Snooze / Open: tapping the notification opens the app on the item. Done and Snooze write `reminder_occurrences` through sync; other devices mark the bell item read on their next sync.

## Alerts (early alerts and repeats)
- Any reminder can have early alerts (`alerts_before`, minutes before the time, up to 6) and repeats (`nag_every_min`, `nag_count`): after the time it alerts again every N minutes, up to the count, until the occurrence is acknowledged. Done or Snooze on any device stops the rest.
- The alert times come from `occurrenceAlerts` in `packages/core/src/alerts.ts`, used by both the device scheduler and `UserHub`, so both channels send the same alerts.
- Each alert has its own key and notification tag (`<occurrenceId>@<offset>`; the alert at the time keeps the occurrence id), so every alert makes a sound instead of silently replacing the last one.
- Standalone reminders (`target_type: "standalone"`): a reminder of its own, with a title and optional details, made from quick add and listed on `/reminders`.
- Phone offline (data off) and app closed: nothing can alert at that moment, because a web app on iPhone cannot schedule notifications on the device itself. The push service holds each alert and delivers it as soon as the phone is back online (up to 24 h). With the app open, the device's own timers alert even offline.

## Rules
- Occurrence ID: `uuidv5(reminderId + ":" + fireAtUtcISO)`. Devices and server compute it independently.
- Snooze: acknowledges the current occurrence and creates a one-off reminder at the snooze time (5 min, 15 min, 1 hour, tomorrow 09:00, custom).
- Recurring: RRULE subset (`FREQ=DAILY|WEEKLY|MONTHLY|YEARLY`, `INTERVAL`, `BYDAY`). The next occurrence is computed in the reminder's IANA timezone, so 09:00 weekly stays 09:00 local.
- Missed (device asleep/offline, push expired): on open, any past-due unacknowledged occurrence shows once, labelled "Missed at <time>".
- Clearing elsewhere: a notification acknowledged on one device clears on the others when they next open or sync. Web Push cannot silently remove a notification on iPhone.
- Permission: ask the first time the user sets a reminder, never on first launch, with one line explaining why. If denied, the bell and in-app banner still work; Settings explains how to enable.
- Quiet hours (phase 2).

## Web Push
- VAPID keys generated once (`pnpm --filter api vapid:generate`), stored as Worker secrets; the public key is served to the app at `/api/push/vapid-public-key`.
- Subscriptions: `POST /api/push/subscribe` with the browser's subscription JSON and the device ID; stored in the user's `UserHub`. A 404/410 from the push service deletes the subscription (as in Chop).
- Sender: WebCrypto (VAPID ES256 JWT + RFC 8291 `aes128gcm`), no Node APIs, so it runs in the Worker.
- Service worker `push` handler shows `{ title, body, url, tag }`; `notificationclick` focuses an open window and navigates, or opens one (as in Chop).
- iPhone: Web Push works only for the PWA added to the home screen (iOS 16.4+). No action buttons on iPhone; tapping opens the app.

## Notification centre
Bell in the top bar: fired reminders, sync problems ("3 changes waiting to sync"), account notices; newest first; unread count; synced across devices (`notifications` records, ID `uuidv5("notification:" + occurrenceId)` for reminders).

## Manual device test matrix
Like Chop's `PUSH-FIELD-TEST.md`: `docs/push-field-test.md` lists each platform (iPhone installed PWA, Android installed PWA, Android Chrome tab, Mac Chrome) with app open, app closed, phone locked, and phone offline then online.
