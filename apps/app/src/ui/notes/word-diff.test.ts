import { describe, expect, it } from "vitest"
import { MAX_DIFF_WORDS, wordDiff } from "./word-diff"

describe("wordDiff", () => {
  it("marks added and removed words", () => {
    expect(wordDiff("Start with the UI", "Start with sync")).toEqual([
      { text: "Start with ", kind: "same" },
      { text: "the UI", kind: "removed" },
      { text: "sync", kind: "added" },
    ])
  })

  it("returns one same part for equal texts and handles empty sides", () => {
    expect(wordDiff("a b", "a b")).toEqual([{ text: "a b", kind: "same" }])
    expect(wordDiff("", "new")).toEqual([{ text: "new", kind: "added" }])
    expect(wordDiff("old", "")).toEqual([{ text: "old", kind: "removed" }])
    expect(wordDiff("", "")).toEqual([])
  })

  it("gives up on very long texts", () => {
    const long = "w ".repeat(MAX_DIFF_WORDS + 10)
    expect(wordDiff(long, "w")).toBeNull()
  })

  it("rebuilds both texts from the parts", () => {
    // Small seeded generator, so the check is repeatable.
    let seed = 7
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const pieces = ["a", "b", "c", " ", "\n", "dd"]
    const text = () => Array.from({ length: Math.floor(rand() * 30) }, () => pieces[Math.floor(rand() * pieces.length)]).join("")
    for (let run = 0; run < 300; run++) {
      const before = text()
      const after = text()
      const parts = wordDiff(before, after)!
      expect(parts.filter((p) => p.kind !== "added").map((p) => p.text).join("")).toBe(before)
      expect(parts.filter((p) => p.kind !== "removed").map((p) => p.text).join("")).toBe(after)
    }
  })
})
