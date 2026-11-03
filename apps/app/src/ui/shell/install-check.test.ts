import { describe, expect, it } from "vitest"
import { shouldOfferInstall } from "./install-check"

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
const CHROME_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1"
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15"
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"

describe("shouldOfferInstall", () => {
  it("offers on iPhone Safari outside the Home Screen app", () => {
    expect(shouldOfferInstall(SAFARI, false)).toBe(true)
    expect(shouldOfferInstall(SAFARI, undefined)).toBe(true)
  })

  it("does not offer in the Home Screen app, other browsers or other devices", () => {
    expect(shouldOfferInstall(SAFARI, true)).toBe(false)
    expect(shouldOfferInstall(CHROME_IOS, false)).toBe(false)
    expect(shouldOfferInstall(MAC, undefined)).toBe(false)
    expect(shouldOfferInstall(ANDROID, undefined)).toBe(false)
  })
})
