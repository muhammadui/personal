import {
  bytesToBase64,
  DEFAULT_PULL_LIMIT,
  MAX_PULL_LIMIT,
  type PulledDoc,
  type PulledRecord,
  type PullResponse,
  type SyncedTable,
} from "@personal/core"
import type { Sql } from "postgres"
import { withUser } from "../db/client"

export function parsePullQuery(since: string | undefined, limit: string | undefined): { since: number; limit: number } | null {
  const s = since === undefined || since === "" ? 0 : Number(since)
  const l = limit === undefined || limit === "" ? DEFAULT_PULL_LIMIT : Number(limit)
  if (!Number.isSafeInteger(s) || s < 0 || !Number.isSafeInteger(l) || l < 1) return null
  return { since: s, limit: Math.min(l, MAX_PULL_LIMIT) }
}

/** Rows and doc updates with server_version > since, in version order, one page at a time. */
export async function pull(sql: Sql, userId: string, since: number, limit: number): Promise<PullResponse> {
  return withUser(sql, userId, async (tx) => {
    const records = await tx<
      { tbl: SyncedTable; id: string; data: Record<string, unknown>; field_hlc: Record<string, string>; server_version: string }[]
    >`
      SELECT tbl, id::text, data, field_hlc, server_version FROM records
      WHERE user_id = ${userId} AND server_version > ${since}
      ORDER BY server_version LIMIT ${limit + 1}`
    const docRows = await tx<{ id: string; note_id: string; data: Uint8Array; server_version: string }[]>`
      SELECT id::text, note_id::text, data, server_version FROM doc_updates
      WHERE user_id = ${userId} AND server_version > ${since}
      ORDER BY server_version LIMIT ${limit + 1}`

    type Item = { v: number; rec?: PulledRecord; doc?: PulledDoc }
    const items: Item[] = [
      ...records.map((r) => ({
        v: Number(r.server_version),
        rec: { table: r.tbl, id: r.id, data: r.data, fieldHlc: r.field_hlc, serverVersion: Number(r.server_version) },
      })),
      ...docRows.map((d) => ({
        v: Number(d.server_version),
        doc: { id: d.id, noteId: d.note_id, update: bytesToBase64(new Uint8Array(d.data)), serverVersion: Number(d.server_version) },
      })),
    ].sort((a, b) => a.v - b.v)

    const page = items.slice(0, limit)
    const hasMore = items.length > limit
    const last = page[page.length - 1]
    return {
      changes: page.flatMap((i) => (i.rec ? [i.rec] : [])),
      docs: page.flatMap((i) => (i.doc ? [i.doc] : [])),
      cursor: last ? last.v : since,
      hasMore,
    }
  })
}
