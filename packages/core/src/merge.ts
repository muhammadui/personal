/**
 * Per-field last-write-wins by HLC. Shared by the server (applying pushes) and the
 * device (applying pulls), so both sides resolve conflicts identically.
 */

export type RecordState = {
  data: Record<string, unknown>
  fieldHlc: Record<string, string>
}

export type MergeResult = { state: RecordState; changed: boolean }

/** Apply a set of field writes that all carry the same HLC. */
export function mergeFields(
  current: RecordState | undefined,
  fields: Record<string, unknown>,
  hlc: string,
): MergeResult {
  const data = { ...(current?.data ?? {}) }
  const fieldHlc = { ...(current?.fieldHlc ?? {}) }
  let changed = false
  for (const [field, value] of Object.entries(fields)) {
    const prev = fieldHlc[field]
    if (prev === undefined || hlc > prev) {
      data[field] = value
      fieldHlc[field] = hlc
      changed = true
    }
  }
  return { state: { data, fieldHlc }, changed }
}

/** Merge a full remote row (each field with its own HLC) into a local one. */
export function mergeRemote(current: RecordState | undefined, remote: RecordState): MergeResult {
  const data = { ...(current?.data ?? {}) }
  const fieldHlc = { ...(current?.fieldHlc ?? {}) }
  let changed = false
  for (const [field, hlc] of Object.entries(remote.fieldHlc)) {
    const prev = fieldHlc[field]
    if (prev === undefined || hlc > prev) {
      data[field] = field in remote.data ? remote.data[field] : null
      fieldHlc[field] = hlc
      changed = true
    }
  }
  return { state: { data, fieldHlc }, changed }
}

/** Highest HLC in a row; used to advance a device clock past everything it has seen. */
export function maxHlc(fieldHlc: Record<string, string>): string | undefined {
  let max: string | undefined
  for (const h of Object.values(fieldHlc)) if (max === undefined || h > max) max = h
  return max
}
