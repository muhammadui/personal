import { expect, test, type Page } from "@playwright/test"

/**
 * P0-12 "Done when": a task added offline in one browser appears in another after
 * reconnecting. Needs e2e@example.com in ALLOWED_EMAILS (apps/api/.dev.vars).
 */
const EMAIL = "e2e@example.com"
const PASSWORD = "correct horse battery staple"

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email").first().fill(EMAIL)
  await page.getByLabel("Password").first().fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  const today = page.getByRole("heading", { name: "Today" }).first()
  const signedIn = await today
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (signedIn) return
  // First run on a fresh database: create the account instead.
  await page.getByText(/create an account/i).first().click()
  await page.getByLabel("Your name").fill("E2E")
  await page.getByLabel("Email").first().fill(EMAIL)
  await page.getByLabel("Password").first().fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.keyboard.press("Escape")
  await expect(today).toBeVisible({ timeout: 15_000 })
}

test("a task added offline on one device reaches another after reconnecting", async ({ browser }) => {
  const laptop = await browser.newContext()
  const phone = await browser.newContext()
  const a = await laptop.newPage()
  const b = await phone.newPage()
  await signIn(a)
  await signIn(b)

  const title = `Offline task ${Date.now()}`
  await laptop.setOffline(true)
  await a.getByRole("button", { name: "Task", exact: true }).click()
  await a.getByPlaceholder("Call mum tomorrow 6pm").fill(`${title} today`)
  await a.getByRole("button", { name: "Add task" }).click()
  await expect(a.getByText(title)).toBeVisible()
  await b.waitForTimeout(1500)
  await expect(b.getByText(title)).toHaveCount(0)

  await laptop.setOffline(false)
  await a.evaluate(() => window.dispatchEvent(new Event("online")))
  await expect(b.getByText(title)).toBeVisible({ timeout: 15_000 })

  await laptop.close()
  await phone.close()
})

test("P0-10: device B shows device A's change within 2 seconds (WebSocket poke)", async ({ browser }) => {
  const laptop = await browser.newContext()
  const phone = await browser.newContext()
  const a = await laptop.newPage()
  const b = await phone.newPage()
  await signIn(a)
  await signIn(b)
  // Let both devices finish their first sync and open their sockets.
  await expect(b.getByText(/synced/i).first()).toBeVisible({ timeout: 15_000 })
  await a.waitForTimeout(1500)

  const title = `Live task ${Date.now()}`
  await a.getByRole("button", { name: "Task", exact: true }).click()
  await a.getByPlaceholder("Call mum tomorrow 6pm").fill(`${title} today`)
  await a.getByRole("button", { name: "Add task" }).click()
  await expect(a.getByText(title)).toBeVisible()
  // 500 ms local debounce + push + poke + pull must land well inside 2 s.
  await expect(b.getByText(title)).toBeVisible({ timeout: 2_000 })

  await laptop.close()
  await phone.close()
})
