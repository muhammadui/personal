import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { addNote } from "../../data/actions"
import { useSession } from "../../data/session"
import { CommandPalette } from "./command-palette"
import { emitUi } from "./events"
import { G_TIMEOUT_MS, isMac, matchShortcut, type ShortcutAction } from "./shortcut-keys"
import { ShortcutsDialog } from "./shortcuts-dialog"

function isTyping(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null
  return Boolean(t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)))
}

/** Global keyboard shortcuts (Shortcuts.dc.html), the command palette (⌘K) and the shortcuts sheet (?). */
export function KeyboardHost() {
  const { store, engine } = useSession()
  const navigate = useNavigate()
  const [palette, setPalette] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)
  const pendingG = useRef<number | null>(null)
  const mac = typeof navigator !== "undefined" && isMac(navigator.platform || navigator.userAgent)
  const mod = mac ? "⌘" : "Ctrl"

  const run = useCallback(
    (action: ShortcutAction | "go-trash") => {
      switch (action) {
        case "palette":
          setShortcuts(false)
          setPalette((p) => !p)
          return
        case "shortcuts":
          setPalette(false)
          setShortcuts(true)
          return
        case "search":
          void navigate({ to: "/search" })
          return
        case "new-task": {
          // Today has a quick-add bar on desktop; elsewhere open the quick-add sheet.
          const bar = document.querySelector<HTMLInputElement>("[data-quick-add]")
          if (bar && bar.offsetParent !== null) bar.focus()
          else emitUi({ type: "quick-add" })
          return
        }
        case "new-note":
          void addNote(store).then((id) => navigate({ to: "/notes/$noteId", params: { noteId: id } }))
          return
        case "sync":
          void engine.syncNow()
          return
        case "go-today":
          void navigate({ to: "/" })
          return
        case "go-upcoming":
          void navigate({ to: "/upcoming" })
          return
        case "go-notes":
          void navigate({ to: "/notes" })
          return
        case "go-settings":
          void navigate({ to: "/settings" })
          return
        case "go-trash":
          void navigate({ to: "/trash" })
          return
      }
    },
    [navigate, store, engine],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const result = matchShortcut(e, {
        typing: isTyping(e.target),
        overlay: document.querySelector("dialog[open]") !== null,
        pendingG: pendingG.current !== null,
        mac,
      })
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
      }
      if (result.pendingG) pendingG.current = window.setTimeout(() => (pendingG.current = null), G_TIMEOUT_MS)
      if (!result.action) return
      e.preventDefault()
      run(result.action)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      if (pendingG.current !== null) window.clearTimeout(pendingG.current)
    }
  }, [run, mac])

  return (
    <>
      <CommandPalette open={palette} onClose={() => setPalette(false)} run={run} mod={mod} />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} mod={mod} mac={mac} />
    </>
  )
}
