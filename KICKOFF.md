# How to start with Claude Code

1. Create a new GitHub repo called `personal` and clone it on the Mac.
2. Copy everything from this kit into the repo root: `CLAUDE.md`, `docs/`, `assets/`, this file.
3. Export the logo files listed in `assets/README.md` into `assets/brand/`, and fill in the brand colour hex values.
4. Commit and push: "Add spec and Claude Code instructions".
5. Open the repo in Claude Code and send the prompts below, one at a time.

## Prompt 1 — understand, no code
> Read CLAUDE.md and every file in docs/. Do not write code. Summarise the architecture and the sync design back to me in plain language, then list anything that is unclear, contradictory or missing.

Answer its questions. If an answer changes the design, ask it to update the doc and add a line to docs/decisions.md.

## Prompt 2 — first task
> Start task P0-01 from docs/tasks/phase-0.md. Plan first.

Read the plan. Approve it or ask for changes. When it says it's done, run `pnpm dev` and `pnpm test` yourself.

## Every task after that
> Next task: P0-0X. Plan first.

- One task per session. Clear the conversation between tasks so each starts fresh from the docs.
- Check: tests pass, the box is ticked in docs/tasks/phase-0.md, and its summary tells you what to try.
- From P0-12 on, test by hand on the Mac and the iPhone.

## Accounts you'll need along the way
- GitHub (now)
- Neon project in Frankfurt (before deploying; local dev uses Docker Postgres)
- An always-on host for the API, WebSocket and worker (decide before Phase 1 deploy)
- Email provider, Cloudflare R2, Sentry (Phase 1)
- Apple Developer account: not needed yet
