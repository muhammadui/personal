# Architecture

Personal ships as a web app (PWA) and a standalone desktop app built from one React codebase. Both talk to one API, and each keeps a full local copy of the user's data. The local store is the centre of each client: the UI only talks to it, and the sync engine moves changes to and from the server in the background.

## Components
- Client (web and desktop, same code):
  - Shared React UI
  - Local store: IndexedDB (Dexie) for records, Yjs docs for note bodies, OPFS (web) / app-data files (desktop) for attachments, MiniSearch index
  - Sync engine + outbox (in `packages/core`)
  - Web only: service worker (offline app shell via Workbox, receives Web Push)
  - Desktop only: Tauri shell (native notifications, tray, autostart, OS keychain, auto-update, local reminder scheduler)
- Server:
  - API (Hono on Node): auth, `/sync/*`, signed file URLs, WebSocket pokes
  - Postgres (Neon, Frankfurt): source of server truth, row-level security, per-user `server_version`
  - Worker (pg-boss on the same Postgres): reminder dispatch every minute, Web Push, emails, purge jobs
  - Object storage (Cloudflare R2 or S3-compatible): images, audio, PDFs, export ZIPs
- External: browser push services (Web Push / VAPID), transactional email provider

## Platforms
| Platform | How it ships | Offline | System notifications |
| --- | --- | --- | --- |
| Web | Hosted site, installable PWA (Chrome, Edge, Safari) | Full after first load | Web Push when online |
| macOS | Tauri `.dmg`, signed + notarised, auto-update | Full | Native, fired locally even offline |
| Windows | Tauri `.msi` / `.exe`, auto-update | Full | Native, fired locally even offline |
| Linux | AppImage, `.deb` | Full | Native, fired locally even offline |
| iPhone / Android | The PWA added to the home screen | Full | Web Push (iPhone: only when added to home screen) |

The desktop app can start at login and sit in the tray so reminders fire with the window closed.

## Repo layout
```
apps/
  app/          React + Vite + TanStack Router + Tailwind (PWA)
    src-tauri/  Tauri 2 desktop shell (Rust)
  api/          Hono API, WebSocket, worker entry
  site/         Next.js marketing site (later)
packages/
  core/         Zod schemas, types, HLC, sync protocol + engine, recurrence, reminders
  ui/           Shared components
docs/           This spec
```

## Stack
| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Client UI | React, Vite, TypeScript (strict), Tailwind CSS, TanStack Router |
| Editor | Tiptap (ProseMirror) + Yjs collaboration extension |
| Handwriting (phase 2) | Canvas + Pointer Events (pressure, tilt) + perfect-freehand; strokes stored in the note's Yjs doc |
| Local data | Dexie, Yjs + y-indexeddb, OPFS, MiniSearch |
| PWA | Workbox service worker, web app manifest |
| Desktop | Tauri 2 |
| API | Node, Hono, Zod, Drizzle ORM |
| Realtime | WebSocket pokes, polling fallback |
| Database | Postgres on Neon (Frankfurt); Docker Postgres locally |
| Jobs | pg-boss worker |
| Push | Web Push with VAPID (`web-push`) |
| Email | Transactional provider (Resend, Postmark or similar) |
| Hosting | App: static on Vercel. API + WebSocket + worker: one always-on container host (Vercel functions cannot hold WebSockets or run a per-minute scheduler) |
| Monitoring | Sentry |
| Tests | Vitest, fast-check, Playwright |

## API surface
| Endpoint | Purpose |
| --- | --- |
| `POST /auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Account + session lifecycle |
| `POST /auth/verify-email`, `/auth/forgot`, `/auth/reset` | Verification + recovery |
| `GET /auth/google/start`, `/auth/google/callback` | Google sign-in |
| `GET /devices`, `DELETE /devices/:id` | List / sign out devices |
| `POST /sync/push` | Batch of mutations (see `sync.md`) |
| `GET /sync/pull?since=` | Rows changed since a cursor |
| `POST /sync/docs/:noteId`, `GET /sync/docs/:noteId?sv=` | Yjs updates up and down |
| `POST /attachments/upload-url`, `GET /attachments/:id/url` | Signed URLs |
| `POST /push/subscribe`, `DELETE /push/subscribe/:id` | Web Push registration |
| `POST /reminders/:occurrenceId/ack` | Acknowledge from any device (also possible through sync) |
| `GET /ws` | WebSocket pokes |
| `POST /export`, `DELETE /account` | Export + account deletion |

There are no per-entity REST endpoints for notes or tasks. Every data write goes through sync, so online and offline share one write path.
