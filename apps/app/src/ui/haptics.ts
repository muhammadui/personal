import { WebHaptics } from "web-haptics"

type TriggerInput = Parameters<WebHaptics["trigger"]>[0]

/**
 * Haptic feedback on phones (web-haptics: the Vibration API on Android, the iOS 18+ switch
 * tick on iPhone). iPhone only gives feedback inside the tap itself, so call `haptic()`
 * synchronously in the click handler, before any await.
 */
export type HapticKind = "tap" | "success" | "warning" | "error" | "reminder"

const PREF_KEY = "personal.haptics"
const PATTERNS: Record<HapticKind, TriggerInput> = {
  tap: [{ duration: 15, intensity: 0.4 }],
  success: "success",
  warning: "nudge",
  error: "error",
  // In-app reminder alert (the app is open): three firm pulses.
  reminder: [
    { duration: 200, intensity: 1 },
    { delay: 120, duration: 200, intensity: 1 },
    { delay: 120, duration: 200, intensity: 1 },
  ],
}

/** The same feel for push notifications, as a Vibration API pattern (on, off, on, …). Android only. */
export const REMINDER_VIBRATION = [200, 120, 200, 120, 200]

let instance: WebHaptics | null = null

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off"
  } catch {
    return true
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off")
  } catch {
    // Storage blocked: the setting just won't persist.
  }
}

export function haptic(kind: HapticKind = "tap"): void {
  if (typeof window === "undefined" || !hapticsEnabled()) return
  try {
    instance ??= new WebHaptics()
    void instance.trigger(PATTERNS[kind]).catch(() => undefined)
  } catch {
    // Haptics are a nicety; a browser without support simply stays silent.
  }
}
