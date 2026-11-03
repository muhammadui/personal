# Decisions log

Settled choices. Newest first. Do not reverse one without the owner's approval; add a new entry instead.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-03 | Web Push sender written in-house (`apps/api/src/push/web-push.ts`): RFC 8291 aes128gcm + RFC 8292 VAPID with WebCrypto; dropped `@pushforge/builder` | That library only produces the legacy `aesgcm` encoding, which Apple's push service does not accept; Chop's `web-push` uses aes128gcm. Tests decrypt the payload as a browser would |
| 2026-11-03 | Component styles are the kit's `personal.css` component classes ported unchanged into `packages/ui/src/components.css`; React components emit those classes | Exact match with the approved designs instead of re-typing every value as utilities |
| 2026-11-03 | Times show as 12-hour ("4:00 pm") in the user's timezone | Matches the design kit's copy |
| 2026-11-03 | List colours are stored as token names (e.g. `note-lilac`) in `lists.colour`, never hex | Dark mode swaps the variables; no raw hex in data |
| 2026-11-03 | Deleting a list moves its open tasks to Trash too; restoring the list restores the tasks deleted with it | Nothing becomes an orphan; everything stays restorable for 30 days |
| 2026-11-03 | A reminder on a recurring task moves to the next occurrence at the same offset from the due time | Ticking a daily task keeps its reminder going |
| 2026-11-03 | Routes: `/notes/$noteId`, task detail as a sheet/side panel, `/lists`, `/lists/$listId`, `/reminders/$occurrenceId` | TanStack Router path params; screens.md updated |
| 2026-11-03 | Locked notes encrypt each Yjs update (AES-GCM, Argon2id key) and still merge; locking compacts all server history for the note into one encrypted snapshot | Supersedes the 'whole-blob LWW' rule: merging stays lossless and the server never keeps plaintext |
| 2026-11-03 | UI follows the owner's design kit in `docs/design/` (tokens, components, motion, approved screens). Added `lucide-react` and self-hosted fonts (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/jetbrains-mono`) | Owner-approved designs; fonts must work offline in the PWA |
| 2026-11-03 | Hosting is $0 forever: Cloudflare Workers free plan (static app + API + Durable Objects) and Neon free plan (Postgres, Frankfurt). Supersedes "always-on container host" and "app on Vercel" | Owner budget is $0. Vercel Hobby cron is once a day (±59 min) so reminders cannot fire; Render free sleeps after 15 min; Fly has no free tier. Cloudflare free has Durable Objects, alarms, WebSockets and free static assets |
| 2026-11-03 | App and API share one origin: `https://notes.muhammadbniu.com` (Worker custom domain). API lives under `/api/*` | First-party cookies (iPhone Safari blocks third-party cookies); no CORS |
| 2026-11-03 | Reminders and pokes run in one Durable Object per user (`UserHub`): WebSocket pokes (hibernation), an alarm at the next due reminder, Web Push sending. pg-boss is dropped | Nothing polls Neon every minute, so Neon can sleep and stay inside 100 CU-hours/month |
| 2026-11-03 | Auth is self-hosted Better Auth inside the Worker (not Neon-managed). Email + password, email OTP for verification and password reset, sent with Resend from `no-reply@notes.muhammadbniu.com` | Owner choice; proven in the owner's Chop app; same-origin cookies |
| 2026-11-03 | Passwords are stretched on the device with Argon2id (salt derived from the email) before they are sent; the server stores HMAC-SHA256(pepper, salt, prehash) | Workers free plan allows 10 ms CPU per request; server-side Argon2/scrypt cannot fit. Same pattern Bitwarden uses. The pepper is a Worker secret, never in the database |
| 2026-11-03 | Sessions are Better Auth cookie sessions (HttpOnly, same-origin, sliding renewal). Refresh-token rotation with reuse detection from the original `auth.md` is dropped | The token is never readable by JS; Better Auth covers devices list and remote sign-out |
| 2026-11-03 | Sign-up on the owner's instance is limited to an allowlist (`ALLOWED_EMAILS`). Others self-host their own copy | Keeps free-tier limits safe; no hosting of strangers' data |
| 2026-11-03 | Server stores synced records in one generic table `records(user_id, tbl, id, data jsonb, field_hlc jsonb, server_version)` validated per table by Zod in `packages/core`. The device keeps typed Dexie tables | Hyperdrive free plan = 100k queries/day: a push batch is a handful of queries and a pull is one query, instead of one per table. The server is a relay + backup; typed queries happen on the device |
| 2026-11-03 | Delete is an ordinary LWW field: delete sets `deleted_at`, restore clears it. Edits never touch `deleted_at`, so a concurrent edit lands in Trash with the item | Resolves the contradiction between the push rule and the conflict table; defines Restore |
| 2026-11-03 | Note bodies (Yjs) are stored on the server as an opaque, append-only update log stamped with `server_version`, pulled with the normal pull feed. Devices merge; devices upload a compacted snapshot now and then. The device keeps its own update log in Dexie, written in the same transaction as the outbox (no y-indexeddb) | Server never parses Yjs (CPU limit); offline devices learn which docs changed from the normal pull; keeps rule 2 (one transaction) true for note bodies too |
| 2026-11-03 | Server-created rows (settings, Inbox) use deterministic IDs: settings id = user id; Inbox id = uuidv5(userId + ":inbox") | Keeps "devices create IDs" true in spirit; every device computes the same IDs |
| 2026-11-03 | No foreign keys between synced records; a missing parent is shown as "no list"/"no folder". An upsert for a record that does not exist and does not pass the full schema is rejected with `record_missing` | Out-of-order and post-purge arrivals must not break sync |
| 2026-11-03 | Recurring tasks: the next due date is computed from the previous due date, never from completion time | Two devices completing the same task compute the same next ID |
| 2026-11-03 | Timezone lives in `settings` (synced), not the server-only users table | Editable offline |
| 2026-11-03 | Web Push copies the owner's Chop app: VAPID, service worker `push` + `notificationclick`, subscription saved per device, dead subscriptions (404/410) pruned. TTL 24 h; `tag` = occurrence ID. Sender is WebCrypto-based so it runs on Workers | Proven on iPhone (installed PWA) and Android, app closed / phone locked / delivered after coming online |
| 2026-11-03 | "Done on one device clears the alert elsewhere" means: clears as soon as that device opens or syncs; never shown twice (same tag). Silent remote removal is not possible with Web Push on iPhone | Web Push requires every push to show a notification |
| 2026-11-03 | Desktop (Tauri) is deferred | Not a priority for the owner |
| 2026-11-03 | Custom sync engine kept (open question closed) | PowerSync free deactivates after 1 week idle; Zero/Electric need an always-on server; none handle Yjs bodies this way |
| 2026-11-03 | Open source under AGPL-3.0 | Owner choice |
| 2026-11-03 | All code is written by Claude Code; the owner reviews plans, runs tests and uses the app | Owner's working model; makes docs and tests the source of truth |
| 2026-11-03 | Client is React + Vite + TanStack Router, not Next.js | Offline-first SPA; Next.js server features are unused and fight static export |
| 2026-11-03 | Next.js only for the public marketing site (`apps/site`), later | SEO and server rendering matter there, not in the app |
| 2026-11-03 | iPhone uses the PWA; native iOS (Swift) deferred until there is an Apple Developer account and Gate 1 has passed | Free provisioning expires every 7 days and lacks push; PWA covers the need for now |
| 2026-11-03 | Custom sync loop: outbox + push/pull + per-field HLC LWW, Yjs for note bodies | Full control, works the same offline and online |
| 2026-11-03 | Postgres on Neon, Frankfurt | Same provider and region as owner's other projects |
| 2026-11-03 | Reminders fire on every device locally AND via server Web Push, de-duplicated by deterministic occurrence ID | Works offline and with the browser closed |
| 2026-11-03 | Locked-note PINs are 4–8 digits, chosen per note (4, 6 or 8; default 6); the length is not stored, so unlock has an OK key | Owner: 4 digits is not enough |
| 2026-11-03 | Standalone reminders with early alerts and repeats until Done; alert schedule shared in packages/core | Owner request; one schedule so device and push agree |
