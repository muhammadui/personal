# Reminder notifications: field test (by hand)

Real-device behaviour (permission prompts, background push, lock screen) cannot be covered by automated tests. Tick a row only after you have seen it happen on the device. Modelled on Chop's `PUSH-FIELD-TEST.md`.

## Before you start
- Open `https://notes.muhammadbniu.com` and sign in.
- iPhone: Safari → Share → **Add to Home Screen**, then open Personal from the Home Screen icon (Web Push only works there, iOS 16.4+).
- Set a reminder on a task (task → Reminder → custom time, 2 minutes from now). Allow notifications when asked. Settings → Notifications should say "On".

## Matrix
| # | Device | Situation | Expected | Result |
|---|---|---|---|---|
| 1 | Mac Chrome | App open and visible | Banner inside the app with Done / Snooze / Open | |
| 2 | Mac Chrome | Tab in background | System notification | |
| 3 | Mac Chrome | Tab closed, Chrome running | System notification (Web Push) | |
| 4 | iPhone (Home Screen app) | App open | Banner inside the app | |
| 5 | iPhone (Home Screen app) | App closed, phone unlocked | Notification | |
| 6 | iPhone (Home Screen app) | Phone locked | Notification on the lock screen | |
| 7 | iPhone (Home Screen app) | Airplane mode at the reminder time, back online 5 min later | Notification arrives after reconnecting | |
| 8 | iPhone Safari tab (not installed) | Any | No push (expected); bell + banner when the app is open; Settings explains Add to Home Screen | |
| 9 | Two devices | Mark Done on the Mac | iPhone bell item shows as read after it opens or syncs; no second alert for the same reminder | |
| 10 | Any | Tap the notification | Opens the reminder screen with Done / Snooze 15 min / Snooze 1 hour / Open item | |
| 11 | Any | Daily reminder | Arrives again the next day at the same local time | |

## Sign-off
| Tester | Date | Notes |
|---|---|---|
| | | |
