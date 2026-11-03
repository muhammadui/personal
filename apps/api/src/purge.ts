import type { Sql } from "postgres"
import { withUser } from "./db/client"

export const PURGE_AFTER_DAYS = 30

/**
 * Daily job: hard-delete tombstones older than 30 days (the only hard delete, CLAUDE.md rule 5).
 * Runs per user so row-level security still applies. Devices purge their own copies the same way.
 */
export async function purgeTombstones(sql: Sql, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 86_400_000).toISOString()
  const users = await sql<{ id: string }[]>`SELECT id FROM "user"`
  let purged = 0
  for (const { id } of users) {
    purged += await withUser(sql, id, async (tx) => {
      const notes = await tx<{ id: string }[]>`
        DELETE FROM records
        WHERE user_id = ${id} AND data->>'deleted_at' IS NOT NULL AND data->>'deleted_at' < ${cutoff}
        RETURNING id::text, tbl`
      const noteIds = notes.map((n) => n.id)
      if (noteIds.length > 0) {
        await tx`DELETE FROM doc_updates WHERE user_id = ${id} AND note_id = ANY(string_to_array(${noteIds.join(",")}, ',')::uuid[])`
      }
      return notes.length
    })
  }
  return purged
}
