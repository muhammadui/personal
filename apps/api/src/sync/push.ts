import {
  base64ToBytes,
  checkMutation,
  docUpdateSchema,
  MAX_DRIFT_MS,
  mergeFields,
  parseHlc,
  pushRequestSchema,
  validateRecord,
  type DocUpdate,
  type Mutation,
  type PulledRecord,
  type PushResponse,
  type Rejection,
  type RecordState,
  type SyncedTable,
} from "@personal/core"
import type { Sql } from "postgres"
import { withUser } from "../db/client"

export type PushOutcome =
  | { ok: false; status: 400; message: string }
  | { ok: true; response: PushResponse; changed: PulledRecord[]; changedNoteIds: string[] }

type Row = { tbl: SyncedTable; id: string; data: Record<string, unknown>; field_hlc: Record<string, string> }

/**
 * Apply one push batch (docs/sync.md "The sync loop", step 3). The whole batch runs in one
 * transaction with the user's sync-state row locked, so pushes for one user are serialised
 * and versions commit in order. A handful of queries per batch regardless of its size
 * (Hyperdrive free plan counts queries).
 */
export async function applyPush(sql: Sql, userId: string, raw: unknown, now = Date.now()): Promise<PushOutcome> {
  const envelope = pushRequestSchema.safeParse(raw)
  if (!envelope.success) {
    return { ok: false, status: 400, message: envelope.error.issues[0]?.message ?? "Invalid push" }
  }
  const { deviceId } = envelope.data
  const rejected: Rejection[] = []
  const mutations: Mutation[] = []
  for (const m of envelope.data.mutations) {
    const check = checkMutation(m)
    if (!check.ok) {
      rejected.push({ id: check.id, code: check.code, message: check.message })
      continue
    }
    if (parseHlc(check.mutation.hlc).wall > now + MAX_DRIFT_MS) {
      rejected.push({ id: check.mutation.id, code: "clock", message: "Device clock is more than 24 h ahead" })
      continue
    }
    mutations.push(check.mutation)
  }
  const docs: DocUpdate[] = []
  for (const d of envelope.data.docUpdates) {
    const parsed = docUpdateSchema.safeParse(d)
    if (!parsed.success) {
      const id = typeof (d as { id?: unknown })?.id === "string" ? (d as { id: string }).id : "unknown"
      rejected.push({ id, code: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid doc update" })
      continue
    }
    docs.push(parsed.data)
  }

  return withUser(sql, userId, async (tx) => {
    await tx`INSERT INTO user_sync_state (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING`
    const [stateRow] = await tx<{ server_version: string }[]>`
      SELECT server_version FROM user_sync_state WHERE user_id = ${userId} FOR UPDATE`
    let version = Number(stateRow?.server_version ?? 0)

    const incomingIds = [...mutations.map((m) => m.id), ...docs.map((d) => d.id)]
    const seen = new Set(
      incomingIds.length === 0
        ? []
        : (
            await tx<{ id: string }[]>`
              SELECT id::text FROM mutations WHERE user_id = ${userId} AND id = ANY(string_to_array(${incomingIds.join(",")}, ',')::uuid[])`
          ).map((r) => r.id),
    )

    const duplicates: string[] = []
    const applied: string[] = []
    const fresh = mutations.filter((m) => {
      if (seen.has(m.id)) {
        duplicates.push(m.id)
        return false
      }
      seen.add(m.id) // a repeated id inside one batch is also a duplicate
      return true
    })

    const recordIds = [...new Set(fresh.map((m) => m.recordId))]
    const current = new Map<string, RecordState>()
    if (recordIds.length > 0) {
      const rows = await tx<Row[]>`
        SELECT tbl, id::text, data, field_hlc FROM records
        WHERE user_id = ${userId} AND id = ANY(string_to_array(${recordIds.join(",")}, ',')::uuid[])`
      for (const r of rows) current.set(`${r.tbl}:${r.id}`, { data: r.data, fieldHlc: r.field_hlc })
    }

    const dirty = new Map<string, { tbl: SyncedTable; id: string; state: RecordState; version: number }>()
    for (const m of fresh) {
      const key = `${m.table}:${m.recordId}`
      const before = current.get(key)
      const { state, changed } = mergeFields(before, m.fields, m.hlc)
      if (!before && !validateRecord(m.table, state.data).success) {
        rejected.push({ id: m.id, code: "record_missing", message: `No ${m.table} record ${m.recordId} to update` })
        continue
      }
      applied.push(m.id)
      if (changed) {
        current.set(key, state)
        dirty.set(key, { tbl: m.table, id: m.recordId, state, version: ++version })
      }
    }

    if (dirty.size > 0) {
      const rows = [...dirty.values()].map((d) => ({
        user_id: userId,
        tbl: d.tbl,
        id: d.id,
        data: d.state.data,
        field_hlc: d.state.fieldHlc,
        server_version: d.version,
      }))
      await tx`
        INSERT INTO records (user_id, tbl, id, data, field_hlc, server_version)
        SELECT x.user_id, x.tbl, x.id::uuid, x.data, x.field_hlc, x.server_version
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
          AS x(user_id text, tbl text, id text, data jsonb, field_hlc jsonb, server_version bigint)
        ON CONFLICT (user_id, tbl, id) DO UPDATE
          SET data = EXCLUDED.data, field_hlc = EXCLUDED.field_hlc, server_version = EXCLUDED.server_version`
    }

    const changedNoteIds = new Set<string>()
    for (const d of docs) {
      if (seen.has(d.id)) {
        duplicates.push(d.id)
        continue
      }
      seen.add(d.id)
      if (d.compactsUpTo !== undefined) {
        await tx`DELETE FROM doc_updates WHERE user_id = ${userId} AND note_id = ${d.noteId} AND server_version <= ${d.compactsUpTo}`
      }
      await tx`
        INSERT INTO doc_updates (user_id, id, note_id, data, server_version)
        VALUES (${userId}, ${d.id}, ${d.noteId}, ${Buffer.from(base64ToBytes(d.update))}, ${++version})`
      applied.push(d.id)
      changedNoteIds.add(d.noteId)
    }

    const loggedIds = applied
    if (loggedIds.length > 0) {
      await tx`
        INSERT INTO mutations (user_id, id, device_id)
        SELECT ${userId}, x, ${deviceId} FROM unnest(string_to_array(${loggedIds.join(",")}, ',')::uuid[]) AS x
        ON CONFLICT DO NOTHING`
    }
    await tx`UPDATE user_sync_state SET server_version = ${version} WHERE user_id = ${userId}`

    const changed: PulledRecord[] = [...dirty.values()].map((d) => ({
      table: d.tbl,
      id: d.id,
      data: d.state.data,
      fieldHlc: d.state.fieldHlc,
      serverVersion: d.version,
    }))
    return {
      ok: true as const,
      response: { applied, duplicates, rejected, serverVersion: version },
      changed,
      changedNoteIds: [...changedNoteIds],
    }
  })
}
