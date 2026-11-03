const KEY = "personal.justSignedUp"

/** Set after sign-up so the app opens on "Check your email" once. */
export function markJustSignedUp(): void {
  try {
    sessionStorage.setItem(KEY, "1")
  } catch {
    // Without storage the verify screen is still reachable from the banner.
  }
}

export function takeJustSignedUp(): boolean {
  try {
    const v = sessionStorage.getItem(KEY) === "1"
    sessionStorage.removeItem(KEY)
    return v
  } catch {
    return false
  }
}
