# Architecture

Personal is a web app (PWA) built from one React codebase. It talks to one API, and each device keeps a full local copy of the user's data. The local store is the centre of each client: the UI only talks to it, and the sync engine moves changes to and from the server in the background.

Everything runs at $0: Cloudflare Workers free plan and Neon free plan (see `decisions.md`).

## Components
- Client (browser / installed PWA):
  - React UI
  - Local store: IndexedDB (Dexie) for records, the outbox and the Yjs update log; MiniSearch index
  - Sync engine + outbox (in `packages/core` and `apps/app/src/sync`)
  - Service worker: offline app shell (Workbox precache) and Web Push (`push`, `notificationclick`), modelled on the owner's Chop app
- Server: one Cloudflare Worker at `https://notes.muhammadbniu.com`
  - Static assets: the built app (free and unlimited on Cloudflare)
  - API under `/api/*` (Hono): Better Auth, `/api/sync/*`, push subscriptions, WebSocket upgrade
  - `UserHub` Durable Object, one per user: holds that user's WebSockets (hibernation), keeps the user's reminder schedule, sets an alarm for the next due reminder, sends Web Push
  - Postgres on Neon (Frankfurt), reached through Hyperdrive: auth tables, the generic `records` table, the Yjs update log, idempotency log, per-user `server_version`. Row-level security on every user table
  - Daily cron trigger: purge tombstones older than 30 days
- External: browser push services (Apple, Google, Mozilla) via VAPID; Resend for email from `no-reply@notes.muhammadbniu.com`

## Why nothing polls the database
Neon's free plan gives 100 CU-hours a month and sleeps after 5 minutes idle. A per-minute job would keep it awake about 730 hours a month. Reminders therefore live in each user's Durable Object (alarm at the next due time), so Neon only wakes when a device actually syncs.

## Free-tier budget (whole Cloudflare account, shared with the owner's other projects)
| Limit | Free | Personal's use |
| --- | --- | --- |
| Worker requests | 100,000/day | Sync calls; static assets don't count |
| Worker CPU | 10 ms/request | No server-side password hashing or Yjs parsing |
| Durable Object requests | 100,000/day | WebSocket messages count 1/20 |
| Durable Object SQLite | 5 GB, 100k rows written/day | Reminder schedule + push subscriptions |
| Hyperdrive | 100,000 queries/day | A push batch is ~6 queries, a pull is 1–2 |
| Cron triggers | 5 per account | 1 (purge) |
| Neon | 1 GB storage, 100 CU-hours/month | Compute capped at 0.25 CU |
| Resend | 3,000 emails/month, 100/day | Verification and reset codes |

## Platforms
| Platform | How it ships | Offline | System notifications |
| --- | --- | --- | --- |
| Web | `notes.muhammadbniu.com`, installable PWA (Chrome, Edge, Safari) | Full after first load | Web Push |
| iPhone / Android | The PWA added to the home screen | Full | Web Push (iPhone: only when added to home screen, iOS 16.4+) |
| Desktop (Tauri) | Deferred | — | — |

## Repo layout
```
apps/
  app/          React + Vite + TanStack Router + Tailwind (PWA)
  api/          Cloudflare Worker: Hono API, Better Auth, UserHub Durable Object, migrations
packages/
  core/         Zod schemas, types, HLC, merge rules, sync protocol, recurrence, reminder IDs
  ui/           Shared components
docs/           This spec
```

## Stack
| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Client UI | React, Vite, TypeScript (strict), Tailwind CSS, TanStack Router |
| Editor | Tiptap (ProseMirror) + Yjs collaboration extension |
| Local data | Dexie, Yjs, MiniSearch |
| PWA | vite-plugin-pwa (Workbox, injectManifest) + web app manifest |
| API | Cloudflare Workers, Hono, Zod, Drizzle ORM (postgres.js over Hyperdrive) |
| Auth | Better Auth (self-hosted), Argon2id on device (hash-wasm) |
| Realtime | WebSocket pokes through the `UserHub` Durable Object, 30 s polling fallback |
| Database | Postgres on Neon (Frankfurt); Docker Postgres locally |
| Jobs | Durable Object alarms (reminders), one cron trigger (purge) |
| Push | Web Push with VAPID, WebCrypto sender |
| Email | Resend |
| Tests | Vitest, fast-check, Playwright |

## API surface
| Endpoint | Purpose |
| --- | --- |
| `/api/auth/*` | Better Auth: sign-up, sign-in, sign-out, email OTP (verify, reset password), list/revoke sessions (= devices) |
| `POST /api/sync/push` | Batch of record mutations and Yjs doc updates (see `sync.md`) |
| `GET /api/sync/pull?since=` | Records and doc updates changed since a cursor |
| `POST /api/push/subscribe`, `POST /api/push/unsubscribe` | Web Push registration per device |
| `GET /api/ws` | WebSocket pokes |
| `GET /api/health` | Health check |

There are no per-entity REST endpoints for notes or tasks. Every data write goes through sync, so online and offline share one write path.
