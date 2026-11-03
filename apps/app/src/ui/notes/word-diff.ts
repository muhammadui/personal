/** Word-level diff for Version history: what changed between an older version and now. */
export type DiffPart = { text: string; kind: "same" | "added" | "removed" }

/** Above this many words on either side the diff is skipped (it is O(n·m)). */
export const MAX_DIFF_WORDS = 3000

function tokens(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? []
}

function push(parts: DiffPart[], text: string, kind: DiffPart["kind"]) {
  const last = parts[parts.length - 1]
  if (last && last.kind === kind) last.text += text
  else parts.push({ text, kind })
}

/**
 * Diff `before` → `after`. Returns null when either text is too long to diff quickly.
 * Whitespace runs are tokens too, so joining every part's text rebuilds both inputs.
 */
export function wordDiff(before: string, after: string): DiffPart[] | null {
  const a = tokens(before)
  const b = tokens(after)
  if (a.length > MAX_DIFF_WORDS * 2 || b.length > MAX_DIFF_WORDS * 2) return null
  const n = a.length
  const m = b.length
  // lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    const row = lcs[i]!
    const next = lcs[i + 1]!
    for (let j = m - 1; j >= 0; j--) row[j] = a[i] === b[j] ? next[j + 1]! + 1 : Math.max(next[j]!, row[j + 1]!)
  }
  const parts: DiffPart[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(parts, a[i]!, "same")
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      push(parts, a[i]!, "removed")
      i++
    } else {
      push(parts, b[j]!, "added")
      j++
    }
  }
  while (i < n) push(parts, a[i++]!, "removed")
  while (j < m) push(parts, b[j++]!, "added")
  return parts
}
