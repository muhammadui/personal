# Personal — instructions for Claude Code

Personal is an offline-first notes + todo app (Samsung Notes-style notes, real tasks, reminders) for the web (PWA) and desktop (Tauri 2), with open sign-up and multi-device sync.

The owner does not write code. You write all of it. The owner reviews plans, runs tests and uses the app. So plans must be readable, and tests are the proof that work is done.

## Read before working
- `docs/README.md` — index of the spec. Read it at the start of every session.
- Then read only the docs the task needs. Before touching sync code, read `docs/sync.md` in full.
- `docs/decisions.md` — settled choices. Do not reverse one without asking.
- `docs/tasks/` — the task lists. Work on one task at a time, by its ID (e.g. P0-07).

## Stack (do not change without asking)
- pnpm workspaces + Turborepo, TypeScript strict everywhere
- `apps/app`: React + Vite + TanStack Router + Tailwind. Single-page app and PWA (desktop/Tauri deferred)
- `apps/api`: Cloudflare Worker (free plan) + Hono + Zod + Drizzle + Better Auth; `UserHub` Durable Object for WebSocket pokes, reminder alarms and Web Push
- `apps/site`: Next.js marketing site (later; not part of the app)
- `packages/core`: shared Zod schemas, types, HLC, sync protocol, sync engine
- `packages/ui`: shared components
- Local data: Dexie (IndexedDB) incl. the Yjs update log (no y-indexeddb, see decisions.md), Yjs, OPFS for files (phase 2), MiniSearch
- Server data: Postgres (Neon free, Frankfurt, via Hyperdrive in production; local Docker Postgres in dev). Hosting must stay $0 — see docs/decisions.md
- Tests: Vitest (unit), fast-check (property tests), Playwright (end to end)

## Non-negotiable rules
1. The UI never calls the network for data. It reads and writes the local store only. The sync engine is the only code that talks to `/sync/*`.
2. Every local write updates the record AND appends to the outbox in ONE Dexie transaction. No exceptions.
3. Record IDs are UUIDv7, created on the device. Never let the server assign IDs.
4. Every field write carries an HLC timestamp from `packages/core/hlc`. Never compare `Date.now()` values to resolve conflicts.
5. Deletes are tombstones (`deleted_at`), never hard deletes, except the scheduled purge job.
6. Every server query is scoped by `user_id` and protected by Postgres row-level security.
7. No server rendering, no Next.js, no server components in `apps/app`.
8. Locked-note content is encrypted on the device before it is stored or synced. The server never sees plaintext or keys.
9. All API inputs and sync payloads are validated with the Zod schemas in `packages/core`.

## How to work
- Start every task in plan mode. The plan names the files you will touch, the tests you will add, and anything in the docs that is unclear. Wait for approval.
- A task is done only when its "Done when" checks pass, `pnpm typecheck`, `pnpm lint` and `pnpm test` pass, and you have ticked it in `docs/tasks/`.
- Never delete, skip or weaken a test to make it pass. If a test seems wrong, stop and explain why.
- If the docs and the code disagree, or the docs are ambiguous, ask. Do not guess on sync, auth or data-model questions.
- If you must deviate from the docs, update the doc in the same change and add a line to `docs/decisions.md`.
- Ask before adding a new dependency. Prefer small, well-maintained libraries.
- Keep changes small: one task per branch, one commit per logical step, clear commit messages.
- End each task with a short summary for the owner: what changed, how to try it, what to test by hand.

## UI
- Before any UI work, read `docs/design/README.md`, then `docs/design/components.md` and `docs/design/motion.md`.
- Every screen has an approved design in `docs/design/screens/`. Match it. See `docs/design/screens.md` for which file is which route.
- Use only values from `docs/design/tokens.json` (via the CSS variables). No raw hex, no new sizes, no radius above 12px, no Tailwind `rounded-2xl`/`rounded-3xl`/`rounded-full` on cards or buttons.
- Icons: `lucide-react` only. No emoji in the UI.
- Animations: only the recipes in `motion.md`, and always respect `prefers-reduced-motion`.
- Fonts are self-hosted (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/jetbrains-mono`) so the app looks right offline.

## Commands
First time: `pnpm install`, `pnpm db:up` (Docker Postgres on port 54329), `pnpm db:migrate`, copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
- `pnpm dev` — app (Vite, http://localhost:5173) + api (wrangler dev, :8787; Vite proxies `/api`)
- `pnpm test` — unit, property and API tests (API tests need `pnpm db:up`; they create a throwaway `personal_test` database)
- `pnpm test:convergence` — Gate 1 property test, 5,000 runs
- `pnpm test:e2e` — Playwright
- `pnpm typecheck`, `pnpm lint`
- `pnpm deploy` — build the app and deploy the Worker to notes.muhammadbniu.com
- `pnpm --filter api vapid:generate` — new VAPID key pair
- Desktop (Tauri) is deferred.

## Style
- Functional React components, hooks, no class components.
- Named exports. Files in kebab-case. One component per file.
- Errors: typed result objects in `packages/core`; never swallow errors silently.
- User-facing copy: short, plain English. Default timezone Africa/Lagos, but always use the user's stored timezone.
