# Offline-first data and sync

The local database is the source of truth for the UI. The server is a relay and a backup. The UI never waits on the network.

## Local store
- Records (folders, notes, tasks, lists, reminders, tags, settings, notifications, …): IndexedDB via Dexie, typed tables. One database per signed-in user, named `personal-<userId>`.
- Note bodies: one Yjs document per note. Every Yjs update is stored in the Dexie table `doc_updates` (the device's own log) in the same transaction as its outbox entry. Opening a note replays its log; the log is compacted into one update now and then.
- Search: MiniSearch index over note plain text, task titles and tags; rebuilt on start, updated on every save.
- Outbox: Dexie tables `outbox` (record mutations) and `doc_outbox` (Yjs updates), device only.
- Attachments (phase 2): OPFS, keyed by SHA-256 content hash.

## IDs and clocks
- Every record ID is a UUIDv7 created on the device. Deterministic exceptions (UUIDv5, namespace `PERSONAL_NAMESPACE` in `packages/core/ids`): settings (= user id), Inbox (`userId + ":inbox"`), next recurring task (`seriesId + ":" + nextDueISO`), reminder occurrences (`reminderId + ":" + fireAtUtcISO`), reminder notifications (`"notification:" + occurrenceId`).
- Every field write carries a hybrid logical clock (HLC) timestamp.
- HLC string format (lexicographically sortable): `<wallMs padded to 15 digits>-<counter padded to 5 digits>-<deviceId>`
  e.g. `000001793667275-00003-0193a1b2c3d4`
- HLC rules: on local event, `wall = max(now, last.wall)`; counter increments if wall unchanged, else resets to 0. On receiving a remote HLC, advance local clock past it. Implementation lives in `packages/core/hlc` with property tests.
- Every synced row stores `field_hlc` (map of field name → HLC of its last write) so conflicts resolve per field.

## Mutation shape
```ts
type Mutation = {
  id: string;            // client mutation ID, UUIDv7, unique forever
  table: SyncedTable;    // 'folders' | 'notes' | 'tasks' | 'lists' | 'tags' | 'note_tags' | 'task_tags'
                         // | 'attachments' | 'reminders' | 'reminder_occurrences' | 'notifications' | 'settings'
                         // | 'note_versions'
  recordId: string;      // id of the record
  op: 'upsert' | 'delete';
  fields: Record<string, unknown>; // only the changed fields. delete = { deleted_at: ISO }, restore = upsert { deleted_at: null }
  hlc: string;           // HLC of this write; applies to every field in `fields`
};

type DocUpdate = {
  id: string;            // UUIDv7, unique forever (idempotency)
  noteId: string;
  update: string;        // base64 Yjs update
  compactsUpTo?: number; // set when this update is a snapshot replacing every server update with server_version <= n
};
```

## Server storage
- `records(user_id, tbl, id, data jsonb, field_hlc jsonb, server_version)`; primary key `(user_id, tbl, id)`. `data` is validated per table with the Zod schemas in `packages/core`.
- `doc_updates(user_id, id, note_id, data bytea, server_version)`.
- `mutations(user_id, id, applied_at)`: idempotency log for both mutations and doc updates.
- `user_sync_state(user_id, server_version)`: per-user counter. A push locks this row (`SELECT … FOR UPDATE`) so pushes for one user are serialised and commit in version order (a puller can never skip a version).
- Row-level security on all four tables.

## The sync loop
1. A user action writes the record to Dexie and appends a Mutation to the outbox, in ONE transaction.
2. When online, the engine sends outbox items in order, in batches of up to 200, to `POST /api/sync/push`.
3. The server, per batch, in one Postgres transaction:
   - locks the user's `user_sync_state` row;
   - skips any mutation whose ID is already in `mutations` (idempotent retry);
   - for each field, writes the value only if the incoming HLC is greater than `field_hlc[field]` (`mergeMutation` in `packages/core`, shared with the client);
   - rejects an upsert that would create a record failing its full schema (`record_missing`) and any invalid mutation (`invalid`);
   - gives every changed row the next `server_version`;
   - records the mutation IDs;
   - stores doc updates (deleting the rows a snapshot compacts).
4. The server tells the user's `UserHub`, which pokes the user's other connected devices over WebSocket and updates its reminder schedule.
5. Each device calls `GET /api/sync/pull?since=<cursor>` and applies returned rows with the same per-field HLC rule (`mergeRemote`), then advances its cursor. Rows from its own device are applied too (harmless; they converge).
6. Doc updates come back in the same pull feed and are applied to the local log and any open editor.

### Push
```
POST /api/sync/push
{ "deviceId": "...", "mutations": Mutation[], "docUpdates": DocUpdate[] }   // max 200 mutations, 50 doc updates
→ 200 { "applied": string[], "duplicates": string[],
        "rejected": [{ "id": string, "code": string, "message": string }],
        "serverVersion": number }
```
- Rejected mutations are removed from the outbox, logged, and shown as a sync notice. They never block later mutations.
- Network failure: keep the outbox, retry with exponential backoff (1 s → 60 s cap, with jitter).
- 401: sync pauses until the user signs in again.

### Pull
```
GET /api/sync/pull?since=<serverVersion>&limit=1000
→ 200 { "changes": [{ "table": SyncedTable, "id": string, "data": object, "fieldHlc": object, "serverVersion": number }],
        "docs": [{ "id": string, "noteId": string, "update": string, "serverVersion": number }],
        "cursor": number, "hasMore": boolean }
```
- Loop while `hasMore`. A device offline for weeks pulls the same way.

### Triggers
- On app start, on regaining network (`online` event), on window focus, on WebSocket poke, after every local write (debounced 500 ms).
- Polling every 30 s while the app is open if the WebSocket is down.

## Conflict rules
| Data | Rule | Example |
| --- | --- | --- |
| Note body | Yjs CRDT merge; no edit lost | Laptop adds a paragraph offline, phone fixes a typo elsewhere; both survive |
| Record fields | Last write wins per field, by HLC | Laptop renames a task, phone changes its due date; both apply |
| Same field on two devices | Later HLC wins | Two titles; later one shows |
| Delete vs edit | `deleted_at` is its own field and only Delete/Restore write it, so an edit never undeletes. The item sits in Trash with the edit applied; restorable | Note deleted on laptop, edited on phone → in Trash with the edit |
| Recurring task completed on two devices | Completion is idempotent; the next task's ID is `uuidv5(seriesId + ":" + nextDueISO)` and the next due date comes from the previous due date, so it is created once | Two ticks → one next task |
| Locked note body (phase 1 later) | Each Yjs update is encrypted on the device before it is stored or sent; the server only sees ciphertext and still just stores the log | Merges like any other note |

## Storage persistence
- Call `navigator.storage.persist()` after sign-in; warn if refused. Show "N changes waiting to sync" in the notification centre when the outbox is older than 10 minutes and the device is online.
- iPhone: tell users to add the PWA to the home screen (installed web apps keep storage and get Web Push).

## Tests required (Gate 1)
- Property test: two or three simulated devices + the real server sync code against test Postgres; fast-check generates random operations (create, edit fields, delete, restore, doc edits), random offline periods, random delivery order and duplicates; after full sync, every device and the server hold identical data.
- Retry test: the same push batch sent twice applies once.
- Clock skew test: a device with a clock 10 minutes fast does not permanently win conflicts against a later real edit after HLC exchange.
