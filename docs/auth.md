# Accounts and authentication

Sign-up and sign-in use email + password through self-hosted Better Auth running inside the Worker. One account works on every device; a device that has signed in once keeps working offline.

## Sign-up and sign-in
- Sign-up is limited to the emails in the `ALLOWED_EMAILS` secret (comma-separated). Anyone else gets "Sign-up is closed on this server." Others can self-host.
- Passwords: minimum 8 characters. The device stretches the password before sending it:
  `prehash = Argon2id(password, salt = SHA-256("personal:" + lowercase(email)), m = 19 MiB, t = 2, p = 1, 32 bytes)` → hex.
  The server stores `HMAC-SHA256(PASSWORD_PEPPER, randomSalt || prehash)` with its random salt. The real password never leaves the device, and the server's work fits in the 10 ms CPU budget.
- Changing the email changes the salt, so an email change requires re-entering the password (later).
- Email verification: 6-digit code by email (Better Auth email OTP). The app is usable before verification.
- Password reset: 6-digit code by email, valid 10 minutes. Resetting signs out all other devices.
- Google sign-in: later.
- Rate limits: Better Auth rate limiting stored in Postgres (not memory; Workers isolates don't share memory).
- On sign-up the server creates: the settings row (id = user id) and the Inbox list (id = uuidv5(userId + ":inbox")), both as normal synced records.

## Email
- Sent with Resend from `Personal <no-reply@notes.muhammadbniu.com>`.
- Plain transactional layout: the code, one line on what it is for and when it expires, an ignore line, the domain. Always with a text part. No emojis.
- In development (no `RESEND_API_KEY`), emails are printed to the console.

## Sessions
- Better Auth session cookie: HttpOnly, Secure, SameSite=Lax, same origin as the app. Expires after 60 days without use; renewed while in use.
- Settings → Devices lists sessions (device name, last seen); any session can be revoked remotely.
- The sync API, WebSocket and push endpoints all require a valid session.

## Offline behaviour
- First sign-in on a device and account creation need the network.
- After that the app opens straight into local data with no session check; writes queue in the outbox.
- If the session has expired, sync pauses and the app asks the user to sign in again; the outbox is kept and pushed after sign-in.
- Sign-out warns if the outbox has unsynced changes, then wipes the local database for that account.
- Several accounts on one device each get their own local database (`personal-<userId>`); data never mixes.
