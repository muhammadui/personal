# Decisions log

Settled choices. Newest first. Do not reverse one without the owner's approval; add a new entry instead.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-03 | All code is written by Claude Code; the owner reviews plans, runs tests and uses the app | Owner's working model; makes docs and tests the source of truth |
| 2026-11-03 | Client is React + Vite + TanStack Router, not Next.js | Offline-first SPA inside Tauri; Next.js server features are unused and fight static export |
| 2026-11-03 | Next.js only for the public marketing site (`apps/site`), later | SEO and server rendering matter there, not in the app |
| 2026-11-03 | iPhone uses the PWA; native iOS (Swift) deferred until there is an Apple Developer account and Gate 1 has passed | Free provisioning expires every 7 days and lacks push; PWA covers the need for now |
| 2026-11-03 | Desktop is Tauri 2 wrapping the same app bundle | One codebase; native notifications, tray, keychain |
| 2026-11-03 | Custom sync loop: outbox + push/pull + per-field HLC LWW, Yjs for note bodies | Full control, works the same offline and online (revisit: see open question in roadmap.md) |
| 2026-11-03 | Postgres on Neon, Frankfurt | Same provider and region as owner's other projects |
| 2026-11-03 | API + WebSocket + worker on one always-on container host, not Vercel functions | WebSockets and a per-minute scheduler need a long-running process |
| 2026-11-03 | Reminders fire on every device locally AND via server Web Push, de-duplicated by deterministic occurrence ID | Works offline and with the browser closed |
