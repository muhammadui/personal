# Morning report — 3 Nov 2026

## In one minute
- **The app is built, tested and on GitHub:** https://github.com/muhammadui/personal (public, AGPL-3.0). It covers Phase 0 plus most of Phase 1, styled to your design kit.
- **It isn't live at notes.muhammadbniu.com yet.** Cloudflare needs one click from you first (step 1 below).
- **You can use it on your Mac right now:** I left it running at **http://localhost:5173**.
- **Tests:**
  - 236 automated tests pass: 118 core, 83 app, 35 server;
  - the 5,000-run Gate 1 sync test passes;
  - 2 browser end-to-end tests pass;
  - CI on GitHub is green.

## What you need to do (about 5 minutes)
1. **Let Cloudflare host Workers.** Open dash.cloudflare.com → **Workers & Pages** once. That creates the account's free `workers.dev` subdomain, which Cloudflare requires before the first deploy. Claude Code's safety check stopped me from doing it myself.
2. **Deploy.** Either run `bash apps/api/scripts/first-deploy.sh` from the `personal` folder, or deploy from GitHub with Cloudflare Workers Builds:
   - In the Worker's Settings → Build, set **Deploy command** to `pnpm --filter api run deploy` and leave the root directory empty. Build command: `pnpm run build`.
   - After the first build succeeds, set the server secrets once from the `personal` folder: `cd apps/api && npx wrangler secret bulk .prod.worker-secrets.json`. Secrets carry over to later deploys.
3. **On your iPhone:**
   - Open https://notes.muhammadbniu.com in Safari → Share → **Add to Home Screen**.
   - Open it from the Home Screen icon and sign in with **muhammadbniu@gmail.com**. It's the only email allowed to sign up.
   - Allow notifications when you first set a reminder.
4. **Test reminders by hand** with `docs/push-field-test.md` (11 rows: app open or closed, phone locked, phone offline, two devices).
5. **Logo:** the four SVGs I asked for haven't arrived. Drop them in `assets/brand/` and I'll make the icons from them. Until then, the app uses the mark from your design kit's splash screen.
6. **Back up two secrets** somewhere safe, such as a password manager:
   - `apps/api/.prod.worker-secrets.json`, especially `PASSWORD_PEPPER`. If it's lost, every password stops working.
   - `apps/api/.prod.secrets`, which holds the Neon database logins.

   Both are kept out of git.

## Try it on your Mac now
Open http://localhost:5173 and create your account with muhammadbniu@gmail.com. This is a local copy with its own database; the deployed site starts empty.
- Locally, the email code prints in the terminal instead of being emailed.
- Real emails come from `no-reply@notes.muhammadbniu.com` once deployed. The test email you received earlier proved that works.

## What's built
- **Tasks:**
  - Today (overdue and today), Upcoming with a month picker, Flagged, Completed, Lists;
  - quick add that understands "pay bill tomorrow 6pm";
  - task detail: due date and time, priority, flag, list, repeat, subtasks;
  - recurring tasks that never duplicate across devices;
  - Trash with restore.
- **Notes:**
  - rich editor (headings, lists, checklists, code) that merges edits from two offline devices without losing either;
  - pin and favourite;
  - version history: hourly snapshots, a word diff, restore;
  - **locked notes:** PIN, encrypted on your device, the server only ever sees scrambled data;
  - download as Markdown or text, copy as text.
- **Reminders:**
  - on tasks and notes, one-off or repeating;
  - snooze presets;
  - notification bell;
  - push notifications built the same way as `chop`'s: they arrive with the app closed or the phone locked, and late if the phone was offline (held up to 24 h; after that they show as "Missed at…").
- **Everywhere:**
  - works fully offline, syncs within about 2 seconds when online;
  - offline search;
  - command palette (⌘K) and keyboard shortcuts (?) on desktop;
  - light and dark themes, a timezone setting;
  - devices list with remote sign-out;
  - export all your data, delete your account;
  - splash, onboarding, the iPhone "Add to Home Screen" guide.
- **Accounts:** email and password with verification and reset codes by email (Resend). Your password is scrambled on your device before it's sent, so the server never sees it.

## Hosting (all $0)
| Service | What it runs | Free limit you'd hit first |
|---|---|---|
| Cloudflare Workers | The app, the API, live updates, reminder timers | 100,000 requests a day, shared with your other Cloudflare projects |
| Neon (Frankfurt) | Database (project `personal`, created overnight) | 100 compute-hours a month. Nothing checks it every minute, so it sleeps when idle. |
| Resend | Emails from notes.muhammadbniu.com | 100 a day |

I measured sign-in at about 2.5 ms of server time against Cloudflare's 10 ms limit. That was in Node; I'll confirm on Cloudflare after the deploy.

## Things I fixed or decided on my own
All of these are recorded in `docs/decisions.md`.
- **Push encryption:** the first push library used an old format that, as far as I know, iPhone push doesn't accept. I wrote a standards-based sender and checked it against `http_ece`, the same library `chop`'s working push uses underneath.
- **Local sign-up:** it failed with "Invalid origin" in local development. Fixed.
- **Recurring task reminders:** they now move to the next occurrence.
- **Old note versions:** locking a note now also blanks its older plain-text versions, on the server too.
- **Deleting a list:** its tasks go to Trash with it, and restoring the list restores them.
- **Sessions:** a cookie session (Better Auth) replaces the original rotating refresh tokens.
- **Locked notes:** they still merge edits from two devices, which is better than the original "newest version wins" plan.

## Not done yet
- Google sign-in, quiet hours, note folders and tags in the interface, attachments and images (Phase 2), handwriting and voice (Phase 2), the desktop app (on hold).
- **P0-12 and P0-13 aren't ticked.** They need your hand test, and push and install checks on the real iPhone after the deploy.
- **Small differences from the design files** are listed per screen in the commit history. The main ones:
  - no "Continue with Google" button;
  - forgot-password uses a 6-digit code instead of a link;
  - sheets close by tap or Esc, not by dragging down;
  - on the splash, the logo scales in, but the back page can't swing as in the kit, because the logo is a single image.

## Questions for you
1. Is it OK that only your email can sign up on your copy, and others run their own? To add someone, it's one setting.
2. Should "Add to Home Screen" stay a full-screen step after your first sign-in on iPhone? Your design kit has it that way.
3. Are you happy with 4-digit PINs for locked notes, or should longer passwords also be allowed?
