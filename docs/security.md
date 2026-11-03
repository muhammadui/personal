# Security and privacy

- Tenant isolation: every query scoped by `user_id`, enforced by Postgres row-level security.
- Transport: HTTPS and WSS only; HSTS on the web app.
- At rest: provider encryption for Postgres and object storage; attachments served only via short-lived signed URLs.
- Locked notes: PIN/password → key on device (Argon2id 64 MiB, 3 passes, per-note salt) → AES-256-GCM over every Yjs update before it is stored or synced (`apps/app/src/sync/note-crypto.ts`, `note-lock.ts`). Locking replaces the note's whole history, locally and on the server, with one encrypted snapshot, so no plaintext stays on the server; `plain_text` is emptied so search and lists never see the content. The key is held in memory only while the note is open and is forgotten when the app is hidden. Forgotten PIN = unrecoverable note; the lock screen says so. Recovery key: later. Known limit: other devices keep their own earlier plaintext copy in local storage until the note is next opened there.
- App lock (optional): PIN or OS biometrics to open the desktop app; re-lock after a timeout.
- Web hardening: strict Content Security Policy; no third-party scripts in the app; sanitise HTML on paste and import.
- Account controls: export everything as ZIP (Markdown, JSON, original attachments); account deletion removes server data within 30 days.
- Privacy: no ads; no selling or sharing of content; analytics limited to anonymous, opt-in crash and performance data.
- Nigeria Data Protection Act 2023: privacy notice, lawful basis, access and deletion requests handled, before public sign-up opens.
- Secrets: never committed. `.env.example` lists every variable; real values live in the host's secret store.
