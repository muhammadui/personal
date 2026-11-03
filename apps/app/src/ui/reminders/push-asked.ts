const KEY = "personal.pushAsked"

/** Whether we have already explained and asked for notification permission on this device. */
export function pushAsked(): boolean {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

export function markPushAsked(): void {
  try {
    localStorage.setItem(KEY, "1")
  } catch {
    // Not stored; we may ask once more on a later launch.
  }
}
