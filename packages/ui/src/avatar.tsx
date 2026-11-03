/** `.avatar`: circle with initials, brand-navy. */
export function Avatar({ name, size = 36 }: { name: string; size?: 32 | 36 | 40 | 44 }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  return (
    <span className="avatar" style={{ width: size, height: size, flexBasis: size }} aria-hidden>
      {initials}
    </span>
  )
}
