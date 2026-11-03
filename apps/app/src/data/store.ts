import {
  base64ToBytes,
  createHlc,
  mergeFields,
  mergeRemote,
  maxHlc,
  newId,
  receiveHlc,
  serializeHlc,
  tickHlc,
  validateFields,
  type HlcState,
  type Mutation,
  type PulledDoc,
  type PulledRecord,
  type SyncedTable,
  type TableData,
} from "@personal/core"
import type { PersonalDb, Stored } from "./db"

export class WriteError extends Error {
  override name = "WriteError"
}

type Listener = (noteIds: string[]) => void

/** Split a stored row into its data and its HLC map. */
function split<T extends SyncedTable>(row: Stored<T> | undefined) {
  if (!row) return undefined
  const { id: _id, _hlc, ...data } = row as Stored<T> & Record<string, unknown>
  return { data: data as Record<string, unknown>, fieldHlc: _hlc }
}

/**
 * The only way the UI writes data. Every write updates the record, its `_hlc` and appends a
 * Mutation to the outbox in ONE Dexie transaction (CLAUDE.md rule 2).
 */
export class Store {
  private docListeners = new Set<Listener>()
  private writeListeners = new Set<() => void>()

  constructor(
    readonly db: PersonalDb,
    readonly deviceId: string,
    private readonly now: () => number = Date.now,
  ) {}

  onLocalWrite(fn: () => void): () => void {
    this.writeListeners.add(fn)
    return () => this.writeListeners.delete(fn)
  }

  onRemoteDocs(fn: Listener): () => void {
    this.docListeners.add(fn)
    return () => this.docListeners.delete(fn)
  }

  private async nextStamp(): Promise<string> {
    const row = await this.db.sync_state.get("hlc")
    const state = (row?.value as HlcState | undefined) ?? createHlc(this.deviceId, this.now())
    const next = tickHlc(state, this.now())
    await this.db.sync_state.put({ key: "hlc", value: next })
    return serializeHlc(next)
  }

  /** Write changed fields of one record. Use the helpers below in UI code. */
  async write<T extends SyncedTable>(
    table: T,
    recordId: string,
    fields: Partial<TableData[T]>,
    op: Mutation["op"] = "upsert",
  ): Promise<void> {
    const checked = validateFields(table, fields as Record<string, unknown>)
    if (!checked.success) {
      throw new WriteError(`Invalid ${table} fields: ${checked.error.issues[0]?.message ?? "unknown"}`)
    }
    const records = this.db.recordTable(table)
    await this.db.transaction("rw", [records, this.db.outbox, this.db.sync_state], async () => {
      const stamp = await this.nextStamp()
      const existing = split(await records.get(recordId))
      const { state } = mergeFields(existing, fields as Record<string, unknown>, stamp)
      await records.put({ id: recordId, ...state.data, _hlc: state.fieldHlc } as Stored<T>)
      await this.db.outbox.add({
        mutation: { id: newId(), table, recordId, op, fields: fields as Record<string, unknown>, hlc: stamp },
        created_at: this.now(),
        attempts: 0,
      })
    })
    for (const fn of this.writeListeners) fn()
  }

  async create<T extends SyncedTable>(
    table: T,
    data: Omit<TableData[T], "created_at" | "updated_at">,
    id: string = newId(),
  ): Promise<string> {
    const iso = new Date(this.now()).toISOString()
    await this.write(table, id, { ...data, created_at: iso, updated_at: iso } as unknown as Partial<TableData[T]>)
    return id
  }

  async update<T extends SyncedTable>(table: T, id: string, fields: Partial<TableData[T]>): Promise<void> {
    const iso = new Date(this.now()).toISOString()
    await this.write(table, id, { ...fields, updated_at: iso } as Partial<TableData[T]>)
  }

  async remove(table: SyncedTable, id: string): Promise<void> {
    await this.write(table, id, { deleted_at: new Date(this.now()).toISOString() } as never, "delete")
  }

  async restore(table: SyncedTable, id: string): Promise<void> {
    await this.write(table, id, { deleted_at: null } as never)
  }

  /** Append a local Yjs update to the note's log and the doc outbox in one transaction. */
  async writeDocUpdate(noteId: string, update: Uint8Array): Promise<void> {
    const id = newId()
    await this.db.transaction("rw", [this.db.doc_updates, this.db.doc_outbox], async () => {
      await this.db.doc_updates.add({ id, note_id: noteId, update, synced: 0, created_at: this.now() })
      await this.db.doc_outbox.add({ id, note_id: noteId, update })
    })
    for (const fn of this.writeListeners) fn()
  }

  /** Apply a pulled page: per-field LWW for records, append for doc updates, advance the clock. */
  async applyRemote(changes: PulledRecord[], docs: PulledDoc[], cursor: number): Promise<void> {
    const tables = [...new Set(changes.map((c) => c.table))].map((t) => this.db.recordTable(t))
    await this.db.transaction("rw", [...tables, this.db.doc_updates, this.db.sync_state], async () => {
      const hlcRow = await this.db.sync_state.get("hlc")
      let clock = (hlcRow?.value as HlcState | undefined) ?? createHlc(this.deviceId, this.now())
      for (const c of changes) {
        const records = this.db.recordTable(c.table)
        const current = split(await records.get(c.id))
        const { state, changed } = mergeRemote(current, { data: c.data, fieldHlc: c.fieldHlc })
        if (changed) await records.put({ id: c.id, ...state.data, _hlc: state.fieldHlc } as Stored<typeof c.table>)
        const top = maxHlc(c.fieldHlc)
        if (top) {
          try {
            clock = receiveHlc(clock, top, this.now())
          } catch {
            // A stamp more than 24 h ahead is ignored for the clock; the data still merges.
          }
        }
      }
      for (const d of docs) {
        if (!(await this.db.doc_updates.get(d.id))) {
          await this.db.doc_updates.add({ id: d.id, note_id: d.noteId, update: base64ToBytes(d.update), synced: 1, created_at: this.now() })
        }
      }
      await this.db.sync_state.put({ key: "hlc", value: clock })
      await this.db.sync_state.put({ key: "cursor", value: cursor })
    })
    const noteIds = [...new Set(docs.map((d) => d.noteId))]
    if (noteIds.length > 0) for (const fn of this.docListeners) fn(noteIds)
  }

  async cursor(): Promise<number> {
    return ((await this.db.sync_state.get("cursor"))?.value as number | undefined) ?? 0
  }

  async pendingCount(): Promise<number> {
    return (await this.db.outbox.count()) + (await this.db.doc_outbox.count())
  }
}
