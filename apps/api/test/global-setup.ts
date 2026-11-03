import postgres from "postgres"
import { migrate } from "../scripts/migrate"

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres:postgres@localhost:54329/postgres"
export const TEST_DB = "personal_test"

/** Fresh test database for every run: drop, create, migrate. */
export default async function setup() {
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} })
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`)
  } finally {
    await admin.end()
  }
  const ownerUrl = ADMIN_URL.replace(/\/[^/]+$/, `/${TEST_DB}`)
  await migrate(ownerUrl, "personal_app", () => {})
}
