/** Onboarding shows once per browser, before the first sign-in. */
export const ONBOARDED_KEY = "personal.onboarded"

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) !== null
  } catch {
    return true
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, new Date().toISOString())
  } catch {
    // Private mode: onboarding may show again, which is harmless.
  }
}
