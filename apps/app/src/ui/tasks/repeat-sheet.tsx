import { describeRule } from "@personal/core"
import { Banner, Button, Chip, List, Sheet } from "@personal/ui"
import { Check, Info } from "lucide-react"
import { useState } from "react"
import { DAY_CODES, DAY_NAMES, REPEAT_MODES, repeatModeOf, ruleFor, type RepeatMode } from "./repeat-options"

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"
  return `${n}${s}`
}

/** PhoneRepeat: options with a tick, weekday chips for Weekly, and a summary. Saves on each change. */
export function RepeatSheet({ open, onClose, rule, dueDay, onChange }: { open: boolean; onClose: () => void; rule: string | null; dueDay: number | null; onChange: (rule: string | null) => void }) {
  const current = repeatModeOf(rule)
  const [days, setDays] = useState<string[]>(current.days)

  const pick = (mode: RepeatMode, nextDays = days) => onChange(ruleFor(mode, nextDays))

  const chosen = DAY_CODES.flatMap((d, i) => (days.includes(d) ? [DAY_NAMES[i]] : []))
  const summary =
    current.mode === "weekly"
      ? `Every ${chosen.join(", ") || "week"}. The next one appears when you tick this one.`
      : current.mode === "custom" && rule
        ? `${describeRule(rule)}.`
        : {
            never: "Happens once.",
            daily: "Every day at the same time.",
            weekdays: "Monday to Friday.",
            weekly: "",
            monthly: dueDay ? `Every month on the ${ordinal(dueDay)}.` : "Every month.",
            yearly: "Every year on the same date.",
            custom: "",
          }[current.mode]

  return (
    <Sheet open={open} onClose={onClose} label="Repeat">
      <div className="flex items-center justify-between">
        <h2 className="t-title3">Repeat</h2>
        <Button variant="ghost" size="sm" style={{ color: "var(--text-accent)" }} onClick={onClose}>
          Done
        </Button>
      </div>
      <List>
        {REPEAT_MODES.map((o) => (
          <button key={o.value} type="button" className="task row-btn" style={{ minHeight: 50 }} aria-pressed={current.mode === o.value} onClick={() => pick(o.value)}>
            <span className="task-body">
              <span className="t-body-strong" style={{ fontWeight: 600 }}>
                {o.label}
              </span>
            </span>
            {current.mode === o.value ? (
              <span className="fade-in flex" style={{ color: "var(--text-accent)" }}>
                <Check size={20} strokeWidth={2} aria-hidden />
              </span>
            ) : null}
          </button>
        ))}
      </List>
      {current.mode === "weekly" ? (
        <div className="fade-in flex flex-col gap-2">
          <span className="t-label">On these days</span>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_CODES.map((d, i) => (
              <Chip
                key={d}
                on={days.includes(d)}
                style={{ padding: 0, justifyContent: "center", height: 40 }}
                aria-label={DAY_NAMES[i]}
                onClick={() => {
                  const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]
                  setDays(next)
                  pick("weekly", next)
                }}
              >
                {DAY_NAMES[i]!.slice(0, 2)}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      <Banner tone="info" icon={<Info aria-hidden />}>
        {summary}
      </Banner>
    </Sheet>
  )
}
