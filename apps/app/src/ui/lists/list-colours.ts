/** Colour choices for lists: names of design tokens, stored in `lists.colour`. */
export const LIST_COLOURS: { value: string; label: string }[] = [
  { value: "brand-blue", label: "Blue" },
  { value: "brand-navy", label: "Navy" },
  { value: "warn", label: "Amber" },
  { value: "brand-lavender", label: "Lavender" },
  { value: "success", label: "Green" },
  { value: "ink-muted", label: "Grey" },
]

const KNOWN = new Set(LIST_COLOURS.map((c) => c.value))

export function listColourVar(colour: string | null | undefined, isInbox = false): string {
  if (colour && KNOWN.has(colour)) return `var(--${colour})`
  return isInbox ? "var(--ink-muted)" : "var(--brand-blue)"
}
