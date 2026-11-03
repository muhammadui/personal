import { describe, expect, it } from "vitest"
import { isMac, matchShortcut, type KeyLike, type ShortcutContext } from "./shortcut-keys"

const k = (key: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods })
const ctx = (over: Partial<ShortcutContext> = {}): ShortcutContext => ({ typing: false, overlay: false, pendingG: false, mac: true, ...over })

describe("matchShortcut", () => {
  it("opens the palette with ⌘K on Mac and Ctrl+K elsewhere, even while typing", () => {
    expect(matchShortcut(k("k", { metaKey: true }), ctx({ typing: true })).action).toBe("palette")
    expect(matchShortcut(k("K", { metaKey: true }), ctx({ overlay: true })).action).toBe("palette")
    expect(matchShortcut(k("k", { ctrlKey: true }), ctx({ mac: false })).action).toBe("palette")
    expect(matchShortcut(k("k", { ctrlKey: true }), ctx({ mac: true })).action).toBeNull()
    expect(matchShortcut(k("k", { metaKey: true }), ctx({ mac: false })).action).toBeNull()
  })

  it("maps the single-key shortcuts", () => {
    expect(matchShortcut(k("n"), ctx()).action).toBe("new-task")
    expect(matchShortcut(k("?", { shiftKey: true }), ctx()).action).toBe("shortcuts")
    expect(matchShortcut(k("/"), ctx()).action).toBe("search")
  })

  it("maps the ⌘ shortcuts", () => {
    expect(matchShortcut(k("n", { metaKey: true }), ctx()).action).toBe("new-note")
    expect(matchShortcut(k("s", { metaKey: true }), ctx()).action).toBe("sync")
    expect(matchShortcut(k(",", { metaKey: true }), ctx()).action).toBe("go-settings")
    expect(matchShortcut(k("s", { metaKey: true }), ctx({ typing: true })).action).toBe("sync")
  })

  it("ignores single keys while typing or with a sheet open", () => {
    expect(matchShortcut(k("n"), ctx({ typing: true })).action).toBeNull()
    expect(matchShortcut(k("/"), ctx({ overlay: true })).action).toBeNull()
    expect(matchShortcut(k("n", { metaKey: true }), ctx({ typing: true })).action).toBeNull()
    expect(matchShortcut(k("s", { metaKey: true }), ctx({ overlay: true })).action).toBeNull()
  })

  it("handles G then T, U or N", () => {
    const first = matchShortcut(k("g"), ctx())
    expect(first).toEqual({ action: null, pendingG: true })
    expect(matchShortcut(k("t"), ctx({ pendingG: true })).action).toBe("go-today")
    expect(matchShortcut(k("u"), ctx({ pendingG: true })).action).toBe("go-upcoming")
    expect(matchShortcut(k("n"), ctx({ pendingG: true }))).toEqual({ action: "go-notes", pendingG: false })
    expect(matchShortcut(k("x"), ctx({ pendingG: true }))).toEqual({ action: null, pendingG: false })
  })

  it("ignores keys with Alt or the wrong modifier", () => {
    expect(matchShortcut(k("n", { altKey: true }), ctx()).action).toBeNull()
    expect(matchShortcut(k("n", { ctrlKey: true }), ctx()).action).toBeNull()
    expect(matchShortcut(k("Enter"), ctx()).action).toBeNull()
  })
})

describe("isMac", () => {
  it("detects Apple platforms", () => {
    expect(isMac("MacIntel")).toBe(true)
    expect(isMac("iPhone")).toBe(true)
    expect(isMac("Win32")).toBe(false)
    expect(isMac("Linux x86_64")).toBe(false)
  })
})
