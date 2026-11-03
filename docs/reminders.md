# Reminders and notifications

Every reminder fires through two channels: each device's own scheduler (works offline) and a server worker that sends Web Push to browsers (works when the tab is closed). Both use the same deterministic occurrence ID, so the user sees one alert, and acting on it anywhere clears it everywhere.

## Flow
1. Reminder saved → synced to every signed-in device.
2. Device channel: local scheduler fires at the due time → native notification (desktop) or Notification API (web, tab open) + in-app bell.
3. Server channel: worker runs every minute, finds due occurrences not yet acknowledged, sends Web Push to each browser subscription with notification `tag` = occurrence ID. The service worker shows it; a duplicate with the same tag replaces, not stacks.
4. User taps Done, Snooze or Open on any device → acknowledgement written to `reminder_occurrences` through sync → other devices close the matching notification and mark the bell item read.
5. Desktop gets no Web Push; it fires locally.

## Rules
- Occurrences have deterministic IDs: `uuidv5(reminderId + fireAtUtcISO)`. Devices and server compute them independently.
- Local scheduler: on app start, after every sync and every minute, load occurrences due in the next 24 hours and set timers. Desktop runs it in the Tauri/Rust side so it works from the tray.
- Notification actions: Done, Snooze 15 min, Open.
- Snooze: acknowledge current occurrence, create a new occurrence at the snooze time.
- Recurring: schedule the next occurrence when the current one is acknowledged or passes.
- Time zones: local time + IANA zone; 9:00 Africa/Lagos fires at 9:00 Lagos time on any device.
- Missed (device asleep/offline): on wake, any past-due unacknowledged occurrence fires once, labelled "missed at <time>", and the item appears in Overdue.
- Permission denied: in-app bell and banner still work; Settings explains how to enable.
- Quiet hours (phase 2): silent delivery to the bell; pop up when quiet hours end.
- Ask for notification permission the first time the user sets a reminder, not on first launch, with one line explaining why.

## Notification centre
Bell in the top bar: fired reminders, sync problems ("3 changes waiting to sync"), account notices; newest first; unread count; synced across devices.

## Web Push setup
- VAPID keys generated once by a script (`pnpm --filter api vapid:generate`), stored as server secrets; public key exposed to the app at build time.
- iPhone: Web Push works only for the PWA added to the home screen.
