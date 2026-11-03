export type ThemeChoice = "system" | "light" | "dark"

const KEY = "personal.theme"
let mediaCleanup: (() => void) | null = null

function setResolved(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? "dark" : "light"
}

/**
 * Apply a theme by setting data-theme="light" | "dark" on <html> (the tokens swap on it).
 * "system" follows prefers-color-scheme and keeps following it. Remembered for the next launch.
 */
export function applyTheme(theme: ThemeChoice): void {
  mediaCleanup?.()
  mediaCleanup = null
  if (theme === "system" && typeof matchMedia === "function") {
    const mq = matchMedia("(prefers-color-scheme: dark)")
    setResolved(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setResolved(e.matches)
    mq.addEventListener("change", onChange)
    mediaCleanup = () => mq.removeEventListener("change", onChange)
  } else {
    setResolved(theme === "dark")
  }
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this session.
  }
}

export function storedTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}
