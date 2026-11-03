# Roadmap

Four phases, each closed by a gate. Sync is built and proven in Phase 0 before feature work, because every feature writes through it.

| Phase | Scope | Gate to leave it |
| --- | --- | --- |
| 0 Foundations | Monorepo, CI, auth, data model, sync engine + outbox, Yjs doc sync, two-device test rig, PWA + Tauri shells booting | Gate 1: random offline edits on simulated devices always converge (property tests) |
| 1 Usable MVP | Text notes, folders, tags, tasks, recurrence, reminders + push, notification centre, offline search, locked notes, web PWA + desktop builds | Gate 2: owner uses it daily on Mac + iPhone with no lost edits → open sign-up to others |
| 2 Rich notes | Handwriting, images, voice, export, split view, quiet hours, checklist → task | Gate 3: strokes and media sync without loss |
| 3 Later | PDF annotation, handwriting to text, shared notes, native mobile apps | — |

## Phase 1 acceptance tests (Playwright where possible)
- [ ] Network off 48 hours on desktop: create, edit, delete notes and tasks; all reach the browser within 10 s of reconnecting.
- [ ] Same note edited on two offline devices: both sets of edits survive.
- [ ] Reminder set in the browser fires on the desktop app while the desktop is offline.
- [ ] Browser tab closed, laptop online: reminder arrives as Web Push.
- [ ] Done on one device clears the same alert on the other within 10 s.
- [ ] Locked note content unreadable in the database and in a network capture.
- [ ] Sign out wipes local data; signing back in restores everything.
- [ ] A second user signs up and sees none of the first user's data.

## Risks
| Risk | Mitigation |
| --- | --- |
| Sync bugs lose or duplicate data | Idempotent mutations, CRDT note bodies, property tests, version history |
| Web reminders miss when browser closed and offline | Server Web Push when online; desktop as reliable channel; missed reminders surface on next open |
| Browser clears IndexedDB | Persistent storage request; unsynced warning; sync ASAP |
| iPhone Web Push needs home-screen install | Onboarding tells iPhone users to add to home screen; in-app bell always works |
| Large handwritten notes lag | Strokes split per page; lazy rendering |
| Forgotten locked-note password | Warning at lock time; optional recovery key |
| Clock skew | HLC instead of wall clock |

## Open questions
- [ ] Ready-made sync engine (PowerSync, ElectricSQL, Zero, etc.) instead of the custom loop? Decide before P0-07.
- [ ] Which always-on host runs API + WebSocket + worker?
- [ ] "Local only" mode with no account?
- [ ] Free for all, or attachment storage cap with paid tier later?
- [ ] Keep the name "Personal"? Hard to search for; consider a qualifier.
- [ ] Hausa interface language in Phase 1 or later?
