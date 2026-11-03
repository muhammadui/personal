# Security and privacy

- Tenant isolation: every query scoped by `user_id`, enforced by Postgres row-level security.
- Transport: HTTPS and WSS only; HSTS on the web app.
- At rest: provider encryption for Postgres and object storage; attachments served only via short-lived signed URLs.
- Locked notes: PIN/password → key on device (Argon2id, per-note salt) → AES-256-GCM over the Yjs state and attachments before they leave the device. Server stores ciphertext only. Forgotten password = unrecoverable note; the lock screen says so; optional recovery key the user writes down.
- App lock (optional): PIN or OS biometrics to open the desktop app; re-lock after a timeout.
- Web hardening: strict Content Security Policy; no third-party scripts in the app; sanitise HTML on paste and import.
- Account controls: export everything as ZIP (Markdown, JSON, original attachments); account deletion removes server data within 30 days.
- Privacy: no ads; no selling or sharing of content; analytics limited to anonymous, opt-in crash and performance data.
- Nigeria Data Protection Act 2023: privacy notice, lawful basis, access and deletion requests handled, before public sign-up opens.
- Secrets: never committed. `.env.example` lists every variable; real values live in the host's secret store.
