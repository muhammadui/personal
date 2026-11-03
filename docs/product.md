# Product

## What Personal is
An offline-first notes and todo app for the web, installable on phones and computers as a PWA. It combines a Samsung Notes-style notebook (rich text, handwriting, images, voice, locked notes, folders) with a real task manager (due dates, recurring tasks, reminders that notify).

Reference for the notes experience: Samsung Notes (handwriting with pens, pencils, highlighters and eraser; photos; voice recordings; locked notes; PDF annotation; sync across devices). Unlike Samsung Notes, Personal runs in any browser. It is open source (AGPL-3.0) and runs at $0 on Cloudflare and Neon free plans; the owner's instance is limited to an allowlist and anyone else can self-host.

## Goals
- Every create, edit, delete and search works offline.
- A change on one device appears on the user's other online devices within a few seconds.
- Reminders fire on time as an in-app alert and a system notification, even when the app is closed where the platform allows.
- Each account's data is private to its owner. Sign-up on the owner's instance is allowlisted; anyone can self-host.
- Hosting costs nothing.

## Non-goals for v1
- Shared or collaborative notes between users (later phase).
- Native iOS and Android apps. Phones use the PWA installed to the home screen.
- Importing Samsung Notes `.sdocx` files.
- Teams, workspaces or paid plans.
- Desktop app (Tauri): deferred.

## Core use cases
1. Capture fast: one shortcut, type or scribble; saved locally on every keystroke.
2. Plan the day: Today view with due and overdue tasks; tick off, reorder, push to tomorrow.
3. Be reminded: "remind me at 4 pm" or "every Monday 9 am" on a task or note; alert on whichever device is in use.
4. Switch devices: write on the laptop, continue in the browser or phone; same content.
5. Work through an outage: hours or days offline; everything syncs on reconnect with no lost edits.
6. Keep things private: lock a note behind a PIN; unreadable even if someone opens the app.
7. Find anything: search titles, text, checklist items and tags, offline.

## Features by phase

### Notes
| Feature | Behaviour | Phase |
| --- | --- | --- |
| Rich text editor | Headings, bold/italic/underline, text colour, highlight, bullet/numbered/checklist lists, tables, links, code blocks | 1 |
| Autosave + version history | Saves on every change; hourly snapshots while editing; restore an earlier version | 1 |
| Folders | Nested, named, coloured; drag notes between them | 1 |
| Tags, pin, favourite | Tags filter across folders; pinned notes on top | 1 |
| Recents | Recently edited notes rise to the top | 1 |
| Note colour / cover | Colour or simple cover per note for grid view | 1 |
| Lock note | PIN or password per note; content encrypted on device before sync | 1 |
| Trash | 30 days, then purge; restore any time before | 1 |
| Split view | Two notes side by side on wide screens | 2 |
| Handwriting and drawing | Pen, pencil, fountain pen, highlighter, eraser, lasso; colour and thickness; pressure | 2 |
| Images | Insert, crop, rotate, paste, camera capture | 2 |
| Voice recordings | Record in a note; playback with seek | 2 |
| Export | Note to PDF, Markdown, plain text | 2 |
| PDF import + annotation | Open PDF as pages, write/highlight, export annotated | 3 |
| Handwriting to text | Convert handwritten block to typed text | 3 |

### Tasks
| Feature | Behaviour | Phase |
| --- | --- | --- |
| Lists | Inbox (created at sign-up) plus user lists | 1 |
| Task fields | Title, notes, due date/time, priority (none/low/medium/high), subtasks | 1 |
| Recurring tasks | Daily, weekly on chosen days, monthly, yearly, every N days; completing one creates the next | 1 |
| Smart views | Today, Upcoming, Overdue, Completed, Flagged | 1 |
| Quick add | "pay electricity bill tomorrow 6pm" parses a due date | 1 |
| Checklist item → task | Promote a checklist item in a note to a linked task | 2 |

### Reminders and notifications
| Feature | Behaviour | Phase |
| --- | --- | --- |
| Reminder on task or note | One-off or recurring | 1 |
| Snooze | 5 min, 15 min, 1 hour, tomorrow morning, custom | 1 |
| Notification centre | Bell with fired reminders and sync notices, read/unread, synced | 1 |
| System notifications | Web Push (also when the app is closed or the phone is locked) | 1 |
| Quiet hours | Silent during chosen hours; delivered to bell, shown after | 2 |

### Across the app
| Feature | Behaviour | Phase |
| --- | --- | --- |
| Offline everything | All of the above with no network | 1 |
| Multi-device sync | Changes reach other online devices within seconds | 1 |
| Search | Full text across notes, tasks, tags, offline | 1 |
| Shortcuts + command palette | New note, new task, search, jump to list | 1 |
| Light/dark theme | Follows system or set by hand | 1 |
| Settings sync | Theme, default reminder time, quiet hours follow the account | 1 |
