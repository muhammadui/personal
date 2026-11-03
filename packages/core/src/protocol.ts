import { z } from "zod"
import { isHlc } from "./hlc"
import { syncedTableSchema, validateFields, type SyncedTable } from "./schemas"

export const MAX_PUSH_MUTATIONS = 200
export const MAX_PUSH_DOC_UPDATES = 50
export const MAX_DOC_UPDATE_BYTES = 1_000_000
export const DEFAULT_PULL_LIMIT = 1000
export const MAX_PULL_LIMIT = 1000

const hlc = z.string().refine(isHlc, "Invalid HLC")

export const mutationSchema = z.strictObject({
  id: z.uuid(),
  table: syncedTableSchema,
  recordId: z.uuid(),
  op: z.enum(["upsert", "delete"]),
  fields: z.record(z.string(), z.unknown()),
  hlc,
})
export type Mutation = z.infer<typeof mutationSchema>

export const docUpdateSchema = z.strictObject({
  id: z.uuid(),
  noteId: z.uuid(),
  update: z.base64().max(Math.ceil((MAX_DOC_UPDATE_BYTES * 4) / 3) + 4),
  compactsUpTo: z.number().int().nonnegative().optional(),
})
export type DocUpdate = z.infer<typeof docUpdateSchema>

export const pushRequestSchema = z.strictObject({
  deviceId: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
  mutations: z.array(z.unknown()).max(MAX_PUSH_MUTATIONS),
  docUpdates: z.array(z.unknown()).max(MAX_PUSH_DOC_UPDATES).default([]),
})
export type PushRequest = { deviceId: string; mutations: Mutation[]; docUpdates: DocUpdate[] }

export type RejectionCode = "invalid" | "record_missing" | "clock" | "server_error"
export type Rejection = { id: string; code: RejectionCode; message: string }

export type PushResponse = {
  applied: string[]
  duplicates: string[]
  rejected: Rejection[]
  serverVersion: number
}

export type PulledRecord = {
  table: SyncedTable
  id: string
  data: Record<string, unknown>
  fieldHlc: Record<string, string>
  serverVersion: number
}
export type PulledDoc = { id: string; noteId: string; update: string; serverVersion: number }

export type PullResponse = {
  changes: PulledRecord[]
  docs: PulledDoc[]
  cursor: number
  hasMore: boolean
}

export type MutationCheck =
  | { ok: true; mutation: Mutation }
  | { ok: false; id: string; code: RejectionCode; message: string }

/**
 * Validate one mutation's envelope and fields. Unknown or wrongly typed fields reject the
 * whole mutation. A delete must set `deleted_at` to a timestamp and nothing else.
 */
export function checkMutation(raw: unknown): MutationCheck {
  const env = mutationSchema.safeParse(raw)
  const id =
    typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string"
      ? (raw as { id: string }).id
      : "unknown"
  if (!env.success) return { ok: false, id, code: "invalid", message: env.error.issues[0]?.message ?? "Invalid" }
  const m = env.data
  for (const key of ["id", "user_id", "server_version", "_hlc", "field_hlc"]) {
    if (key in m.fields) return { ok: false, id: m.id, code: "invalid", message: `Field not allowed: ${key}` }
  }
  if (m.op === "delete") {
    const keys = Object.keys(m.fields)
    if (keys.length !== 1 || keys[0] !== "deleted_at" || typeof m.fields.deleted_at !== "string") {
      return { ok: false, id: m.id, code: "invalid", message: "Delete must set only deleted_at" }
    }
  }
  const fields = validateFields(m.table, m.fields)
  if (!fields.success) {
    const issue = fields.error.issues[0]
    return {
      ok: false,
      id: m.id,
      code: "invalid",
      message: issue ? `${issue.path.join(".") || "fields"}: ${issue.message}` : "Invalid fields",
    }
  }
  return { ok: true, mutation: m }
}
