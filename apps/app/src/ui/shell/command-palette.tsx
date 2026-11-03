import { DialogShell } from "@personal/ui"
import { PaletteBody } from "./palette-body"
import type { ShortcutAction } from "./shortcut-keys"

/** Palette.dc.html: ⌘K. Search notes and tasks on this device, or run a command. */
export function CommandPalette({ open, onClose, run, mod }: { open: boolean; onClose: () => void; run: (action: ShortcutAction | "go-trash") => void; mod: string }) {
  return (
    <DialogShell open={open} onClose={onClose} label="Command palette" className="palette">
      <PaletteBody onClose={onClose} run={run} mod={mod} />
    </DialogShell>
  )
}
