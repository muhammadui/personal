import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres, { type Sql } from "postgres"
import { authSchema } from "./schema"

export type Db = { sql: Sql; db: PostgresJsDatabase<typeof authSchema> }

/**
 * One client per request on Workers (Hyperdrive pools the real connections).
 * `fetch_types: false` avoids an extra round trip on every new connection.
 */
export function createDb(connectionString: string, opts: { max?: number } = {}): Db {
  const sql = postgres(connectionString, {
    max: opts.max ?? 5,
    fetch_types: false,
    prepare: true,
    onnotice: () => {},
  })
  return { sql, db: drizzle(sql, { schema: authSchema }) }
}

/**
 * Run `fn` in a transaction scoped to one user. Row-level security uses `app.user_id`;
 * `set_config(..., true)` makes it local to this transaction only.
 */
export async function withUser<T>(sql: Sql, userId: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.user_id', ${userId}, true)`
    return fn(tx as unknown as Sql)
  })
  return result as T
}
