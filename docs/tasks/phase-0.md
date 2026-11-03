# Phase 0 — Foundations

Do tasks in order unless told otherwise. Start each in plan mode. Tick the box only when every "Done when" item holds and `pnpm typecheck && pnpm lint && pnpm test` pass.

Night of 2026-11-03: the owner approved working through these without per-task plan approval (see `MORNING-REPORT.md`).

- [x] **P0-01 Scaffold the monorepo**
  pnpm workspaces + Turborepo; TypeScript strict; ESLint + Prettier; Vitest; Playwright; GitHub Actions CI running typecheck, lint, test. Create `apps/app` (Vite + React + TanStack Router + Tailwind), `apps/api` (Cloudflare Worker + Hono, wrangler), `packages/core`, `packages/ui`. `docker-compose.yml` with Postgres for local dev and `.env.example`.
  Done when: `pnpm dev` starts app and api; CI config runs typecheck, lint, test; the Commands section of CLAUDE.md is accurate.

- [x] **P0-02 Shared schemas**
  Zod schemas and TS types in `packages/core` for every synced table in `docs/data-model.md`, plus `Mutation`, `DocUpdate`, push and pull payloads from `docs/sync.md`.
  Done when: schemas exported; unit tests cover valid and invalid examples for each.

- [x] **P0-03 HLC + merge rules**
  `packages/core/hlc` per `docs/sync.md`: create, tick, receive, compare, serialise. `mergeMutation` / `mergeRemote` per-field LWW shared by client and server. Deterministic IDs (`packages/core/ids`).
  Done when: property tests prove monotonicity, correct ordering of serialised strings, recovery from a clock 10 minutes fast, and that merging is order-independent and idempotent.

- [x] **P0-04 Database**
  Drizzle schema + SQL migrations: Better Auth tables, `records`, `doc_updates`, `mutations`, `user_sync_state`; RLS policies; an app role that cannot bypass RLS.
  Done when: migrations run on a fresh Docker Postgres; a test proves user A cannot read or write user B's rows even with a query missing its `user_id` filter.

- [x] **P0-05 Auth**
  Better Auth in the Worker per `docs/auth.md`: allowlisted sign-up, sign-in with device-side Argon2id prehash + server HMAC, email OTP verification and password reset through Resend (console in dev), sign-out, list/revoke sessions. Sign-up creates settings + Inbox records.
  Done when: API tests cover sign-up (allowed / not allowed), sign-in (right / wrong password), verification, reset (old password stops working), session revoke; sign-up creates settings + Inbox.

- [x] **P0-06 Local store**
  Dexie database per user (`personal-<userId>`); typed tables plus `outbox`, `doc_updates`, `doc_outbox`, `sync_state`; a repository where every write updates the record, its `_hlc`, and appends a Mutation in ONE transaction.
  Done when: unit tests (fake-indexeddb) prove a failed write leaves neither record nor outbox entry.

- [x] **P0-07 Server sync**
  `POST /api/sync/push` and `GET /api/sync/pull` per `docs/sync.md`: idempotency, per-field HLC LWW, tombstones, version stamping, pagination, rejection handling, doc updates and compaction.
  Done when: API tests cover duplicate batches, out-of-order arrival, delete vs edit, and pagination across 2,500 changes.

- [x] **P0-08 Client sync engine**
  Push loop (batches, ordered, exponential backoff with jitter), pull loop with cursor, triggers (start, online, focus, poke, 30 s polling fallback), sync status exposed to the UI.
  Done when: tests with a mocked server cover offline queueing, retry after network error, and resume after restart.

- [x] **P0-09 Yjs note doc sync**
  Local Yjs log in Dexie (same transaction as `doc_outbox`); doc updates in push/pull; snapshot compaction.
  Done when: two clients editing the same doc offline converge after sync in tests.

- [x] **P0-10 WebSocket pokes**
  `GET /api/ws` (session cookie) upgrades into the user's `UserHub` Durable Object; the server pokes the user's other devices after applied pushes; client triggers pull on poke.
  Done when: a test shows a poke reaches device B after device A's push.

- [x] **P0-11 Convergence test rig (Gate 1)**
  fast-check property test: 2–3 simulated devices + real server sync code against test Postgres; random ops (create, edit fields, delete, restore, note doc edits), random offline periods, random delivery order and duplicate deliveries.
  Done when: 5,000 runs pass with identical final state on every device and the server; a smaller run is part of `pnpm test`; full run via `pnpm test:convergence`.

- [ ] **P0-12 First usable app (replaces the plain debug screen)** — built; automated e2e passes (offline task reaches the other browser; live update < 2 s). Waiting for the owner's hand test and the push check on the locked iPhone after deploy.
  Sign-up/sign-in screens; Today, Inbox and lists with tasks (add, edit, due date, complete, delete, Trash); notes with the Tiptap + Yjs editor; sync status (outbox count, last sync, online); reminders with local scheduler and Web Push like Chop; notification bell.
  Done when: owner can add a task offline in one browser and see it appear in another after reconnecting, and a reminder arrives on the locked iPhone.

- [ ] **P0-13 PWA + deploy** — built (manifest, service worker, icons, wrangler config, Neon + Hyperdrive ready). Deploy blocked on a one-time Cloudflare step; then check install + offline on Mac Chrome and iPhone.
  Web manifest + service worker (offline app shell + push); placeholder icons; deploy to `notes.muhammadbniu.com` (Worker + static assets + Durable Object + Hyperdrive → Neon Frankfurt).
  Done when: the app opens offline as an installed PWA on Mac Chrome and iPhone Safari (home screen), served from `notes.muhammadbniu.com`.
