# Roadmap

Four phases, each closed by a gate. Sync is built and proven in Phase 0 before feature work, because every feature writes through it.

| Phase | Scope | Gate to leave it |
| --- | --- | --- |
| 0 Foundations | Monorepo, CI, auth, data model, sync engine + outbox, Yjs doc sync, two-device test rig, PWA shell, free deploy | Gate 1: random offline edits on simulated devices always converge (property tests) |
| 1 Usable MVP | Text notes, folders, tags, tasks, recurrence, reminders + push, notification centre, offline search, locked notes | Gate 2: owner uses it daily on Mac + iPhone with no lost edits |
| 2 Rich notes | Handwriting, images, voice, export, split view, quiet hours, checklist → task | Gate 3: strokes and media sync without loss |
| 3 Later | PDF annotation, handwriting to text, shared notes, desktop (Tauri), native mobile apps | — |

## Phase 1 acceptance tests (Playwright where possible)
- [ ] Network off 48 hours on the Mac: create, edit, delete notes and tasks; all reach the iPhone within 10 s of reconnecting.
- [ ] Same note edited on two offline devices: both sets of edits survive.
- [ ] Reminder set on the Mac arrives on the locked iPhone (installed PWA) with the app closed.
- [ ] iPhone offline at the reminder time: the notification arrives when it is back online (within 24 h).
- [ ] Browser tab closed, laptop online: reminder arrives as Web Push.
- [ ] Done on one device clears the same alert on the other when it next opens or syncs; never shown twice.
- [ ] Locked note content unreadable in the database and in a network capture.
- [ ] Sign out wipes local data; signing back in restores everything.
- [ ] A second allowlisted user signs up and sees none of the first user's data; a non-allowlisted email cannot sign up.

## Risks
| Risk | Mitigation |
| --- | --- |
| Sync bugs lose or duplicate data | Idempotent mutations, CRDT note bodies, property tests, version history |
| Web reminders miss when browser closed and offline | Server Web Push (held by the push service up to 24 h); missed reminders surface on next open |
| Browser clears IndexedDB | Persistent storage request; unsynced warning; sync ASAP |
| iPhone Web Push needs home-screen install | Onboarding tells iPhone users to add to home screen; in-app bell always works |
| Large handwritten notes lag | Strokes split per page; lazy rendering |
| Forgotten locked-note password | Warning at lock time; optional recovery key |
| Clock skew | HLC instead of wall clock |

## Open questions
- [x] Ready-made sync engine instead of the custom loop? No: custom kept (see decisions.md).
- [x] Which host runs API + WebSocket + worker? Cloudflare Workers free + Durable Objects.
- [ ] "Local only" mode with no account?
- [x] Free for all, or paid tier? Free, non-commercial, open source; owner's instance allowlisted.
- [ ] Keep the name "Personal"? Hard to search for; consider a qualifier.
- [ ] Hausa interface language in Phase 1 or later?
- [ ] Free-tier limits are shared with the owner's other projects on the same Cloudflare account. Move Personal to its own free account if they grow.
