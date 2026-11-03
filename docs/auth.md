# Accounts and authentication

Anyone can sign up with email + password or Google. One account works on every device; a device that has signed in once keeps working offline.

## Sign-up and sign-in
- Email + password: Argon2id hash; minimum 8 characters; check against a breached-password list. 6-digit code emailed to verify. App usable before verification; sync pauses after 7 days unverified.
- Google: OAuth 2.0 with PKCE. Desktop opens the system browser and returns via a `personal://` deep link (never an embedded login window).
- Password reset: single-use link valid 30 minutes; using it signs out all other devices.
- Rate limits: 5 failed sign-ins per account per 15 minutes, then short lockout; per-IP limits on sign-up.
- On sign-up the server creates: user, settings row, Inbox list.

## Sessions
- Access token: JWT, 15 minutes. Refresh token: 60 days, rotated on every use, stored hashed.
- Web: refresh token in an HttpOnly, Secure, SameSite cookie. Desktop: in the OS keychain via Tauri.
- Settings → Devices lists name, platform, last seen; any device can be signed out remotely.
- Reuse of an already-rotated refresh token revokes that device's whole session chain.

## Offline behaviour
- First sign-in on a device and account creation need the network.
- After that the app opens straight into local data with no token check; writes queue in the outbox.
- If the refresh token expired while offline, the user signs in again; the outbox is kept and pushed after sign-in.
- Sign-out warns if the outbox has unsynced changes, then wipes the local database, files and keys for that account.
- Several accounts on one device each get their own local database; data never mixes.
