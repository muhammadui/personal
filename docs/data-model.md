# Data model

The same tables exist in Postgres and in Dexie on each device; server-only and device-only tables are marked. Every synced table also has: `user_id`, `created_at`, `updated_at`, `deleted_at` (tombstone), `field_hlc` (JSON), `server_version`.

| Entity | Key fields | Notes |
| --- | --- | --- |
| `users` (server) | id, email, password_hash, name, timezone, email_verified_at | timezone default `Africa/Lagos`, editable |
| `sessions` (server) | id, user_id, device_id, refresh_token_hash, last_seen_at, revoked_at | one per signed-in device |
| `devices` | id, user_id, name, platform (`web`, `desktop`), app_version | Settings → Devices |
| `folders` | id, parent_id, name, colour, sort_order | nesting via parent_id |
| `notes` | id, folder_id, title, plain_text, colour, cover, pinned, favourite, locked, lock_salt, last_opened_at | plain_text derived for search; empty when locked |
| `note_docs` | note_id, yjs_state, yjs_state_vector | CRDT body; ciphertext when locked |
| `note_versions` | id, note_id, snapshot, created_at | hourly while editing, before restore, and conflict losers |
| `lists` | id, name, colour, sort_order | Inbox created at sign-up |
| `tasks` | id, list_id, parent_id, note_id, title, notes, due_at, due_has_time, priority, status, completed_at, recurrence_rule, recurrence_parent_id, sort_order | parent_id = subtasks; note_id = promoted checklist item |
| `tags` | id, name, colour | |
| `note_tags`, `task_tags` | id, tag_id, note_id / task_id | join rows with their own IDs so they sync |
| `attachments` | id, note_id, kind (`image`, `audio`, `pdf`), mime, size_bytes, content_hash, storage_key, upload_state | upload_state: local, uploading, uploaded |
| `reminders` | id, target_type (`task`, `note`), target_id, local_time, timezone, fire_at_utc, recurrence_rule, status | status: scheduled, done, cancelled |
| `reminder_occurrences` | id, reminder_id, fire_at_utc, fired_at, acknowledged_at, acknowledged_action, acknowledged_device_id | id deterministic: `uuidv5(reminderId + fireAtUtcISO)` |
| `notifications` | id, kind (`reminder`, `sync`, `account`), title, body, link, read_at | in-app notification centre |
| `settings` | id (= user_id), theme, default_reminder_time, quiet_hours_start, quiet_hours_end, week_start | one row per user |
| `push_subscriptions` (server) | id, user_id, device_id, endpoint, p256dh, auth, created_at | Web Push |
| `mutations` (server) | client_mutation_id, user_id, device_id, applied_at | idempotency log |
| `user_sync_state` (server) | user_id, server_version | per-user counter |
| `outbox` (device) | id, mutation (JSON), created_at, attempts, last_error | pending local changes |
| `sync_state` (device) | key, value | cursor, device_id, HLC state |

Recurrence: RRULE strings (RFC 5545), e.g. `FREQ=WEEKLY;BYDAY=MO`. Times are stored as local time + IANA zone and the computed UTC instant, so 9 am weekly stays 9 am local.

Postgres: every table with `user_id` has row-level security `user_id = current_setting('app.user_id')::uuid`, set per request.
