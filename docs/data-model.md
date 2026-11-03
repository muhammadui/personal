# Data model

Synced records exist as typed Dexie tables on each device and as rows of the generic `records` table on the server (`data` jsonb validated by the Zod schema for its table). Every synced record also has: `id`, `created_at`, `updated_at`, `deleted_at` (tombstone), and on the device `_hlc` (field → HLC map). Field names are snake_case everywhere.

## Synced records (Zod schemas in `packages/core/schemas`)
| Table | Fields | Notes |
| --- | --- | --- |
| `settings` | theme (`system`/`light`/`dark`), timezone (IANA, default `Africa/Lagos`), default_reminder_time (`HH:MM`), week_start (0–6), quiet_hours_start, quiet_hours_end | id = user id; created at sign-up |
| `folders` | parent_id, name, colour, sort_order | nesting via parent_id |
| `notes` | folder_id, title, plain_text, colour, pinned, favourite, locked, lock_salt, lock_check, last_opened_at | plain_text derived from the body for lists and search; empty when locked. lock_check = the PIN-derived key encrypting a fixed value, to verify the PIN |
| `note_versions` | note_id, snapshot (base64 Yjs state), reason (`hourly`/`restore`) | phase 1 later |
| `lists` | name, colour, sort_order, is_inbox | Inbox created at sign-up |
| `tasks` | list_id, parent_id, note_id, title, notes, due_at, due_has_time, priority (`none`/`low`/`medium`/`high`), status (`open`/`done`), completed_at, flagged, recurrence_rule, series_id, sort_order | parent_id = subtask; series_id groups a recurring series |
| `tags` | name, colour | |
| `note_tags`, `task_tags` | tag_id, note_id / task_id | join rows with their own IDs so they sync |
| `attachments` | note_id, kind, mime, size_bytes, content_hash, storage_key, upload_state | phase 2 |
| `reminders` | target_type (`task`/`note`/`standalone`), target_id, title, body?, fire_at (ISO UTC), timezone, recurrence_rule, status (`scheduled`/`done`/`cancelled`), alerts_before? (minutes, ≤6), nag_every_min?, nag_count? | title is copied from the target so push can show it. A standalone reminder's target_id is its own id (a snooze copy keeps the original's id) |
| `reminder_occurrences` | reminder_id, fire_at, acknowledged_at, acknowledged_action (`done`/`snoozed`/`dismissed`), acknowledged_device_id | id deterministic: `uuidv5(reminderId + ":" + fireAt)` |
| `notifications` | kind (`reminder`/`sync`/`account`), title, body, link, read_at, occurrence_id | in-app notification centre |

## Server tables (Postgres)
| Table | Purpose |
| --- | --- |
| `user`, `session`, `account`, `verification`, `rate_limit` | Better Auth |
| `records` | all synced records (see `sync.md`) |
| `doc_updates` | Yjs update log per note |
| `mutations` | idempotency log |
| `user_sync_state` | per-user `server_version` |

Every user table has row-level security `user_id = current_setting('app.user_id')`, set per transaction with `set_config(..., true)`. The app connects as a role that does not own the tables and cannot bypass RLS. Better Auth tables have no RLS (sign-in looks users up by email) and are only touched by Better Auth.

## Durable Object storage (`UserHub`, per user)
| Table | Purpose |
| --- | --- |
| `push_subscriptions` | endpoint, p256dh, auth, device_id, created_at |
| `reminders` | id, title, fire_at, timezone, recurrence_rule, status, link |
| `acks` | occurrence ids already acknowledged |
| `sent` | occurrence ids already pushed |

## Device-only tables (Dexie)
| Table | Purpose |
| --- | --- |
| `outbox` | pending mutations (seq, mutation, created_at, attempts, last_error) |
| `doc_updates` | local Yjs log (id, note_id, update, synced) |
| `doc_outbox` | pending Yjs updates |
| `sync_state` | cursor, device_id, HLC state |

Recurrence: RRULE strings (RFC 5545 subset), e.g. `FREQ=WEEKLY;BYDAY=MO`. Times are stored as the UTC instant plus the IANA zone, so 9 am weekly stays 9 am local.
