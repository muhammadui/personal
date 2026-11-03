/**
 * Apply SQL migrations in apps/api/migrations in order, as the database owner.
 *
 *   DATABASE_OWNER_URL  owner connection (migrations, role setup)
 *   APP_DB_PASSWORD     password to set on the personal_app role (optional; local default "personal_app")
 *
 * Usage: pnpm --filter api db:migrate
 */
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

export async function migrate(ownerUrl: string, appPassword: string, log = console.log): Promise<void> {
  const sql = postgres(ownerUrl, { max: 1, onnotice: () => {} })
  try {
    await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations")
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
    const done = new Set((await sql<{ name: string }[]>`SELECT name FROM _migrations`).map((r) => r.name))
    for (const file of files) {
      if (done.has(file)) continue
      const body = readFileSync(join(dir, file), "utf8")
      await sql.begin(async (tx) => {
        await tx.unsafe(body)
        await tx`INSERT INTO _migrations (name) VALUES (${file})`
      })
      log(`applied ${file}`)
    }
    // Role password is never stored in a migration file.
    await sql.unsafe(`ALTER ROLE personal_app LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}'`)
  } finally {
    await sql.end()
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const ownerUrl = process.env.DATABASE_OWNER_URL ?? "postgres://postgres:postgres@localhost:54329/personal"
  const appPassword = process.env.APP_DB_PASSWORD ?? "personal_app"
  migrate(ownerUrl, appPassword).then(
    () => console.log("migrations up to date"),
    (e: unknown) => {
      console.error(e)
      process.exit(1)
    },
  )
}
