/** Split text into plain and matching parts, so search results can mark the query words. */
export type Part = { text: string; hit: boolean }

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Marks words that start with any query word (MiniSearch matches by prefix). */
export function highlightParts(text: string, query: string): Part[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .sort((a, b) => b.length - a.length)
  if (!text) return []
  if (words.length === 0) return [{ text, hit: false }]
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escapeRe).join("|")})`, "giu")
  const parts: Part[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const start = m.index
    if (start > last) parts.push({ text: text.slice(last, start), hit: false })
    parts.push({ text: m[0], hit: true })
    last = start + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts
}
