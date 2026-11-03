import { List, Sheet } from "@personal/ui"
import { Check } from "lucide-react"
import type { ReactNode } from "react"

export type Option<T extends string> = { value: T; label: string; leading?: ReactNode }

/** A short list of choices in a sheet; picking one closes it. */
export function OptionSheet<T extends string>({ open, onClose, title, value, options, onPick }: { open: boolean; onClose: () => void; title: string; value: T; options: Option<T>[]; onPick: (v: T) => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <h2 className="t-title3">{title}</h2>
      <List>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="task row-btn"
            style={{ minHeight: 50 }}
            aria-pressed={o.value === value}
            onClick={() => {
              onPick(o.value)
              onClose()
            }}
          >
            {o.leading}
            <span className="task-body">
              <span className="t-body-strong" style={{ fontWeight: 600 }}>
                {o.label}
              </span>
            </span>
            {o.value === value ? (
              <span className="fade-in flex" style={{ color: "var(--text-accent)" }}>
                <Check size={20} strokeWidth={2} aria-hidden />
              </span>
            ) : null}
          </button>
        ))}
      </List>
    </Sheet>
  )
}
