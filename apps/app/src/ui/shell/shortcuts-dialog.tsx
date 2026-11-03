import { DialogShell, IconButton, Kbd } from "@personal/ui"
import { Keyboard, X } from "lucide-react"

type Group = { title: string; rows: [string, string[]][] }

/** Shortcuts.dc.html: every shortcut, on "?". */
export function ShortcutsDialog({ open, onClose, mod, mac }: { open: boolean; onClose: () => void; mod: string; mac: boolean }) {
  const groups: Group[] = [
    {
      title: "General",
      rows: [
        ["Search or jump to", [mod, "K"]],
        ["New note", [mod, "N"]],
        ["New task", ["N"]],
        ["Search", ["/"]],
        ["Sync now", [mod, "S"]],
        ["Show shortcuts", ["?"]],
      ],
    },
    {
      title: "Go to",
      rows: [
        ["Today", ["G", "T"]],
        ["Upcoming", ["G", "U"]],
        ["Notes", ["G", "N"]],
        ["Settings", [mod, ","]],
      ],
    },
    {
      title: "Editor",
      rows: [
        ["Bold", [mod, "B"]],
        ["Italic", [mod, "I"]],
        ["Heading", ["#", "space"]],
        ["Bulleted list", [mod, "⇧", "8"]],
        ["Numbered list", [mod, "⇧", "7"]],
      ],
    },
  ]
  return (
    <DialogShell open={open} onClose={onClose} label="Keyboard shortcuts" className="shortcuts-dialog">
      <header className="flex items-center justify-between border-b border-line px-6 py-[18px]">
        <h2 className="t-title3 flex items-center gap-2.5">
          <Keyboard size={20} strokeWidth={2} aria-hidden />
          Keyboard shortcuts
        </h2>
        <IconButton plain label="Close" onClick={onClose}>
          <X size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      </header>
      <div className="grid gap-x-8 gap-y-6 p-6 sm:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} className="flex flex-col gap-1">
            <h3 className="t-label mb-1">{g.title}</h3>
            {g.rows.map(([label, keys]) => (
              <div key={label} className="shortcut-row">
                <span className="t-body" style={{ fontSize: 14 }}>
                  {label}
                </span>
                <span className="flex gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
      <footer className="t-meta px-6 py-3" style={{ background: "var(--surface-sunken)" }}>
        {mac ? "On Windows and Linux, use Ctrl instead of ⌘." : "On a Mac, use ⌘ instead of Ctrl."}
      </footer>
    </DialogShell>
  )
}
