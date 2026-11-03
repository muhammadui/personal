# Offline-first data and sync

The local database is the source of truth for the UI. The server is a relay and a backup. The UI never waits on the network.

## Local store
- Records (folders, note metadata, tasks, reminders, tags, settings, notifications): IndexedDB via Dexie. One database per signed-in user, named `personal-<userId>`.
- Note bodies: Yjs documents, persisted with y-indexeddb, one doc per note.
- Attachments: OPFS (web) or app-data files (desktop), keyed by SHA-256 content hash.
- Search: MiniSearch index over note plain text, task titles and tags; updated on every save.
- Outbox: Dexie table of pending mutations (device only).

## IDs and clocks
- Every record ID is a UUIDv7 created on the device.
- Every field write carries a hybrid logical clock (HLC) timestamp.
- HLC string format (lexicographically sortable): `<wallMs padded to 15 digits>-<counter padded to 5 digits>-<deviceId>`
  e.g. `000001793667275-00003-dev_01J...`
- HLC rules: on local event, `wall = max(now, last.wall)`; counter increments if wall unchanged, else resets to 0. On receiving a remote HLC, advance local clock past it. Implementation lives in `packages/core/hlc` with property tests.
- Every synced row stores `field_hlc` (JSON map of field name → HLC of its last write) so conflicts resolve per field.

## Mutation shape
```ts
type Mutation = {
  id: string;            // client mutation ID, UUIDv7, unique forever
  table: SyncedTable;    // 'folders' | 'notes' | 'tasks' | 'lists' | 'tags' | 'note_tags' | 'task_tags'
                         // | 'attachments' | 'reminders' | 'reminder_occurrences' | 'notifications' | 'settings'
  recordId: string;      // UUIDv7 of the record
  op: 'upsert' | 'delete';
  fields: Record<string, unknown>; // only the changed fields (empty for delete)
  hlc: string;           // HLC of this write; applies to every field in `fields`
};
```

## The sync loop
1. A user action writes the record to Dexie and appends a Mutation to the outbox, in ONE transaction.
2. When online, the engine sends outbox items in order, in batches of up to 200, to `POST /sync/push`.
3. The server, per mutation, in one Postgres transaction:
   - skips it if `client_mutation_id` is already in `mutations` (idempotent retry);
   - for each field, writes the value only if the incoming HLC is greater than `field_hlc[field]`;
   - for delete, sets `deleted_at` if the incoming HLC is greater than the row's latest HLC;
   - increments the user's `server_version` and stamps the row with it;
   - records the mutation ID.
4. The server sends a poke over WebSocket to the user's other connected devices.
5. Each device calls `GET /sync/pull?since=<cursor>` and applies returned rows with the same per-field HLC rule, then advances its cursor. Rows from its own device are applied too (harmless; they converge).
6. Note bodies sync separately as Yjs binary updates (`/sync/docs/:noteId`).
7. Attachments upload in the background via signed URL after their record syncs; other devices download on first open and cache for offline.

### Push
```
POST /sync/push
{ "deviceId": "...", "mutations": Mutation[] }        // max 200
→ 200 { "applied": string[], "duplicates": string[],
        "rejected": [{ "id": string, "code": string, "message": string }],
        "serverVersion": number }
```
- Rejected mutations (validation or permission errors) are removed from the outbox, logged, and shown as a sync notice. They must never block later mutations.
- Network failure: keep the outbox, retry with exponential backoff (1 s → 60 s cap, with jitter).

### Pull
```
GET /sync/pull?since=<serverVersion>&limit=1000
→ 200 { "changes": [{ "table": SyncedTable, "row": object }], // row includes field_hlc, deleted_at, server_version
        "cursor": number, "hasMore": boolean }
```
- Loop while `hasMore`. A device offline for weeks pulls the same way.

### Triggers
- On app start, on regaining network (`online` event), on window focus, on WebSocket poke.
- Polling every 30 s while the app is open if the WebSocket is down.

## Conflict rules
| Data | Rule | Example |
| --- | --- | --- |
| Note body (text, checklists, strokes) | Yjs CRDT merge; no edit lost | Laptop adds a paragraph offline, browser fixes a typo elsewhere; both survive |
| Record fields | Last write wins per field, by HLC | Laptop renames a task, browser changes its due date; both apply |
| Same field on two devices | Later HLC wins; losing value kept in note/task history where history exists | Two titles; later one shows |
| Delete vs edit | Delete wins (tombstone); item goes to Trash with the edit applied; restorable | Note deleted on laptop, edited on browser → in Trash with edit |
| Recurring task completed on two devices | Completion is idempotent; the next occurrence has a deterministic ID (`uuidv5(parentId + nextDueISO)`), so it is created once | Two ticks → one next task |
| Locked note body | Ciphertext cannot be merged: last write wins on the whole blob; the losing version is saved to `note_versions` | Edited locked note on two offline devices → newest wins, other restorable |

## Yjs note docs
- Push: `POST /sync/docs/:noteId` with a binary Yjs update (`Y.encodeStateAsUpdate` diff since last ack).
- Pull: `GET /sync/docs/:noteId?sv=<base64 state vector>` returns the missing update.
- Server stores the merged state in `note_docs.yjs_state` and compacts it periodically.
- Pokes include note IDs whose docs changed, so devices fetch only those.

## Storage persistence
- Web: call `navigator.storage.persist()` after sign-in; warn if refused. Treat outbox items as at risk until pushed; show "N changes waiting to sync" in the notification centre when the outbox is older than 10 minutes and the device is online.
- iPhone: tell users to add the PWA to the home screen (installed web apps keep storage and get Web Push).
- Desktop: storage is not evicted.

## Tests required (Gate 1)
- Property test: two or three simulated devices + in-memory server; fast-check generates random operations, random offline periods and random delivery orders; after full sync, every device and the server hold identical data. Thousands of runs must pass.
- Retry test: the same push batch sent twice applies once.
- Clock skew test: a device with a clock 10 minutes fast does not permanently win conflicts against a later real edit after HLC exchange.
