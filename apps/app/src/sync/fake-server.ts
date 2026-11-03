import {
  checkMutation,
  mergeFields,
  validateRecord,
  type DocUpdate,
  type PulledDoc,
  type PulledRecord,
  type PullResponse,
  type PushResponse,
  type RecordState,
  type SyncedTable,
} from "@personal/core"

/**
 * In-memory stand-in for /api/sync/* used by client tests. Same rules as the real server
 * (packages/core merge + validation); the real server is tested against Postgres in apps/api.
 */
export class FakeSyncServer {
  version = 0
  records = new Map<string, { table: SyncedTable; id: string; state: RecordState; v: number }>()
  docs: PulledDoc[] = []
  seen = new Set<string>()
  offline = false
  failNext = 0
  unauthorized = false
  pushCalls = 0

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input), "http://test")
    if (this.unauthorized) return new Response("{}", { status: 401 })
    if (this.offline) throw new TypeError("Failed to fetch")
    if (this.failNext > 0) {
      this.failNext--
      return new Response("{}", { status: 503 })
    }
    if (url.pathname === "/api/sync/push") return Response.json(this.push(JSON.parse(String(init?.body))))
    if (url.pathname === "/api/sync/pull") return Response.json(this.pull(Number(url.searchParams.get("since") ?? 0), Number(url.searchParams.get("limit") ?? 1000)))
    return new Response("{}", { status: 404 })
  }

  push(body: { mutations: unknown[]; docUpdates: DocUpdate[] }): PushResponse {
    this.pushCalls++
    const res: PushResponse = { applied: [], duplicates: [], rejected: [], serverVersion: 0 }
    for (const raw of body.mutations) {
      const c = checkMutation(raw)
      if (!c.ok) {
        res.rejected.push({ id: c.id, code: c.code, message: c.message })
        continue
      }
      const m = c.mutation
      if (this.seen.has(m.id)) {
        res.duplicates.push(m.id)
        continue
      }
      const key = `${m.table}:${m.recordId}`
      const cur = this.records.get(key)
      const { state, changed } = mergeFields(cur?.state, m.fields, m.hlc)
      if (!cur && !validateRecord(m.table, state.data).success) {
        res.rejected.push({ id: m.id, code: "record_missing", message: "missing" })
        continue
      }
      this.seen.add(m.id)
      res.applied.push(m.id)
      if (changed) this.records.set(key, { table: m.table, id: m.recordId, state, v: ++this.version })
    }
    for (const d of body.docUpdates ?? []) {
      if (this.seen.has(d.id)) {
        res.duplicates.push(d.id)
        continue
      }
      this.seen.add(d.id)
      if (d.compactsUpTo !== undefined) {
        this.docs = this.docs.filter((x) => !(x.noteId === d.noteId && x.serverVersion <= d.compactsUpTo!))
      }
      this.docs.push({ id: d.id, noteId: d.noteId, update: d.update, serverVersion: ++this.version })
      res.applied.push(d.id)
    }
    res.serverVersion = this.version
    return res
  }

  pull(since: number, limit: number): PullResponse {
    const items = [
      ...[...this.records.values()].map((r) => ({ v: r.v, rec: r })),
      ...this.docs.map((d) => ({ v: d.serverVersion, doc: d })),
    ]
      .filter((i) => i.v > since)
      .sort((a, b) => a.v - b.v)
    const page = items.slice(0, limit)
    const changes: PulledRecord[] = page.flatMap((i) =>
      "rec" in i && i.rec ? [{ table: i.rec.table, id: i.rec.id, data: i.rec.state.data, fieldHlc: i.rec.state.fieldHlc, serverVersion: i.rec.v }] : [],
    )
    const docs: PulledDoc[] = page.flatMap((i) => ("doc" in i && i.doc ? [i.doc] : []))
    return { changes, docs, cursor: page.at(-1)?.v ?? since, hasMore: items.length > limit }
  }
}
