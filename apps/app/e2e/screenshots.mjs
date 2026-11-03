// Dev helper (not a test): screenshots of the running app and of the approved designs.
// Usage: node e2e/screenshots.mjs <outDir>
import { chromium, devices } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const out = process.argv[2]
const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")
const designDir = join(root, "docs/design/screens")
const css = readFileSync(join(root, "docs/design/personal.css"), "utf8")
const browser = await chromium.launch()

// Designs
const designs = ["Signin", "PhoneToday", "FirstToday", "PhoneTask", "PhoneNotes", "PhoneEditor", "PhoneSettings", "PhoneInbox", "PhoneUpcoming", "PhoneCapture"]
const dctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await dctx.route("**/_blob/**", (r) => r.fulfill({ contentType: "text/css", body: css }))
await dctx.route("**/support.js", (r) => r.fulfill({ contentType: "application/javascript", body: "" }))
for (const d of designs) {
  const p = await dctx.newPage()
  await p.goto(`http://localhost:8799/screens/${d}.dc.html`)
  await p.waitForTimeout(800)
  await p.screenshot({ path: join(out, `design-${d}.png`), clip: { x: 0, y: 0, width: 390, height: 844 } })
  await p.close()
}

if (process.env.ONLY_DESIGNS) { await browser.close(); process.exit(0) }
// App (iPhone size)
const ctx = await browser.newContext({ ...devices["iPhone 13"], baseURL: "http://localhost:5173" })
const page = await ctx.newPage()
const shot = async (name) => {
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(out, `app-${name}.png`) })
}
await page.goto("/")
await page.waitForTimeout(1500)
await shot("signin")
const email = process.env.SHOT_EMAIL ?? "muhammadbniu@gmail.com"
const pw = "correct horse battery"
// Try sign in; if that fails, create the account.
await page.getByLabel(/email/i).first().fill(email)
await page.getByLabel(/password/i).first().fill(pw)
await page.getByRole("button", { name: /sign in/i }).first().click()
await page.waitForTimeout(2500)
if (await page.getByLabel(/password/i).count()) {
  await page.getByRole("link", { name: /create/i }).first().click().catch(() => page.getByRole("button", { name: /create/i }).first().click())
  await page.waitForTimeout(800)
  await shot("signup")
  await page.getByLabel(/name/i).first().fill("Muhammad")
  await page.getByLabel(/email/i).first().fill(email)
  await page.getByLabel(/password/i).first().fill(pw)
  await page.getByRole("button", { name: /create account/i }).first().click()
  await page.waitForTimeout(3000)
  await shot("after-signup")
  await page.keyboard.press("Escape")
}
await page.goto("/")
await shot("today-empty")
for (const path of ["/upcoming", "/notes", "/notifications", "/settings", "/search", "/trash", "/lists", "/dev/ui"]) {
  await page.goto(path)
  await shot(path.slice(1).replace(/\//g, "-"))
}
await browser.close()
console.log("done")
