# Phase 0 — Foundations

Do tasks in order unless told otherwise. One task per session. Start each in plan mode. Tick the box only when every "Done when" item holds and `pnpm typecheck && pnpm lint && pnpm test` pass.

- [ ] **P0-01 Scaffold the monorepo**
  pnpm workspaces + Turborepo; TypeScript strict; ESLint + Prettier; Vitest; Playwright; GitHub Actions CI running typecheck, lint, test. Create `apps/app` (Vite + React + TanStack Router + Tailwind), `apps/api` (Hono), `packages/core`, `packages/ui`. Add `docker-compose.yml` with Postgres for local dev and `.env.example`.
  Done when: `pnpm dev` starts app and api; CI is green on a pushed branch; the Commands section of CLAUDE.md is accurate.

- [ ] **P0-02 Shared schemas**
  Zod schemas and TS types in `packages/core` for every table in `docs/data-model.md`, plus `Mutation`, push and pull payloads from `docs/sync.md`.
  Done when: schemas exported; unit tests cover valid and invalid examples for each.

- [ ] **P0-03 HLC**
  `packages/core/hlc` per `docs/sync.md`: create, tick, receive, compare, serialise.
  Done when: property tests prove monotonicity, correct ordering of serialised strings, and recovery from a clock 10 minutes fast.

- [ ] **P0-04 Database**
  Drizzle schema + migrations for all server tables; `field_hlc` JSONB and `server_version` columns; row-level security policies; per-user `server_version` counter.
  Done when: migrations run on a fresh Docker Postgres; a test proves user A cannot read or write user B's rows even with a query missing its `user_id` filter.

- [ ] **P0-05 Auth**
  Sign-up, login, refresh (rotation + reuse detection), logout, email verification code, password reset, devices list and remote sign-out, per `docs/auth.md`. Email sent through an interface with a console implementation in dev. Google sign-in can wait until Phase 1.
  Done when: API tests cover every flow including token reuse revoking the session chain; sign-up creates settings + Inbox.

- [ ] **P0-06 Local store**
  Dexie database per user (`personal-<userId>`); tables mirror the data model plus `outbox` and `sync_state`; a repository layer where every write updates the record, its `field_hlc`, and appends a Mutation in ONE transaction.
  Done when: unit tests (fake-indexeddb) prove a failed write leaves neither record nor outbox entry.

- [ ] **P0-07 Server sync**
  `POST /sync/push` and `GET /sync/pull` exactly as in `docs/sync.md`: idempotency, per-field HLC last-write-wins, tombstones, version stamping, pagination, rejection handling.
  Done when: API tests cover duplicate batches, out-of-order arrival, delete vs edit, and pagination across 2,500 changes.

- [ ] **P0-08 Client sync engine**
  Push loop (batches, ordered, exponential backoff with jitter), pull loop with cursor, triggers (start, online, focus, poke, 30 s polling fallback), sync status exposed to the UI.
  Done when: tests with a mocked server cover offline queueing, retry after network error, and resume after restart.

- [ ] **P0-09 Yjs note doc sync**
  y-indexeddb persistence on the client; `/sync/docs/:noteId` push and pull with state vectors; server-side merge and periodic compaction.
  Done when: two clients editing the same doc offline converge after sync in tests.

- [ ] **P0-10 WebSocket pokes**
  `GET /ws` authenticated by access token; server pokes a user's other devices after applied pushes and doc updates; client triggers pull on poke.
  Done when: an integration test shows device B pulls within 2 s of device A's push.

- [ ] **P0-11 Convergence test rig (Gate 1)**
  fast-check property test: 2–3 simulated devices + real server code against test Postgres; random ops (create, edit fields, delete, restore, note doc edits), random offline periods, random delivery order and duplicate deliveries.
  Done when: 5,000 runs pass with identical final state on every device and the server; it runs in CI (fewer runs in CI is fine, full run via `pnpm test:convergence`).

- [ ] **P0-12 Debug UI**
  A plain screen (no design work) to sign up, sign in, create/edit/delete tasks and notes, see the outbox count, last sync time and online status, and edit a note body. For the owner to test by hand on Mac and iPhone.
  Done when: owner can add a task offline in one browser and see it appear in another after reconnecting.

- [ ] **P0-13 PWA and desktop shells**
  Web manifest + Workbox service worker (app loads with no network after first visit); Tauri 2 shell in `apps/app/src-tauri` that runs the same bundle; icons generated from `assets/brand/` (see `assets/README.md`).
  Done when: the app opens offline as an installed PWA on Mac Chrome and iPhone Safari (home screen), and as a Tauri app on macOS.
