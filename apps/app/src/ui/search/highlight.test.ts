import { describe, expect, it } from "vitest"
import { highlightParts } from "./highlight"

describe("highlightParts", () => {
  it("marks word starts that match the query, ignoring case", () => {
    expect(highlightParts("Sync engine first, then resync", "sync")).toEqual([
      { text: "Sync", hit: true },
      { text: " engine first, then resync", hit: false },
    ])
  })

  it("marks several query words and treats regex characters literally", () => {
    expect(highlightParts("Pay (bill) today", "(bill pay")).toEqual([
      { text: "Pay", hit: true },
      { text: " ", hit: false },
      { text: "(bill", hit: true },
      { text: ") today", hit: false },
    ])
  })

  it("returns the text unchanged with an empty query, and nothing for empty text", () => {
    expect(highlightParts("Hello", "  ")).toEqual([{ text: "Hello", hit: false }])
    expect(highlightParts("", "x")).toEqual([])
  })
})
