/**
 * Keyboard shortcuts from Shortcuts.dc.html that work today. Pure, so it can be tested:
 * the shell feeds key events in and runs the returned action.
 */
export type ShortcutAction =
  | "palette"
  | "shortcuts"
  | "search"
  | "new-task"
  | "new-note"
  | "sync"
  | "go-today"
  | "go-upcoming"
  | "go-notes"
  | "go-settings"

export type KeyLike = { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }

export type ShortcutContext = {
  /** Focus is in a text field or the note editor. */
  typing: boolean
  /** A sheet or dialog is open. */
  overlay: boolean
  /** "g" was pressed just before (G then T/U/N). */
  pendingG: boolean
  /** Apple keyboards use ⌘; everything else Ctrl. */
  mac: boolean
}

export type ShortcutResult = { action: ShortcutAction | null; pendingG: boolean }

/** How long "g" waits for its second key. */
export const G_TIMEOUT_MS = 1200

export function matchShortcut(e: KeyLike, ctx: ShortcutContext): ShortcutResult {
  const mod = ctx.mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const none = { action: null, pendingG: false }

  if (mod && !e.altKey) {
    // ⌘K works everywhere, even while typing or with the palette open (it toggles).
    if (key === "k" && !e.shiftKey) return { action: "palette", pendingG: false }
    if (ctx.overlay) return none
    if (key === "s" && !e.shiftKey) return { action: "sync", pendingG: false }
    if (key === "," && !e.shiftKey) return { action: "go-settings", pendingG: false }
    if (key === "n" && !e.shiftKey && !ctx.typing) return { action: "new-note", pendingG: false }
    return none
  }
  if (e.metaKey || e.ctrlKey || e.altKey || ctx.typing || ctx.overlay) return none

  if (ctx.pendingG) {
    if (key === "t") return { action: "go-today", pendingG: false }
    if (key === "u") return { action: "go-upcoming", pendingG: false }
    if (key === "n") return { action: "go-notes", pendingG: false }
    return none
  }
  if (key === "g" && !e.shiftKey) return { action: null, pendingG: true }
  if (key === "?") return { action: "shortcuts", pendingG: false }
  if (key === "/" && !e.shiftKey) return { action: "search", pendingG: false }
  if (key === "n" && !e.shiftKey) return { action: "new-task", pendingG: false }
  return none
}

export function isMac(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform)
}
