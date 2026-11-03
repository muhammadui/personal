import { describe, expect, it } from "vitest"
import { docToMarkdown, docToText, markdownFileName, wordCount, type PmNode } from "./note-markdown"

const p = (...content: PmNode[]): PmNode => ({ type: "paragraph", content })
const t = (text: string, ...marks: string[]): PmNode => ({ type: "text", text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) })
const li = (...content: PmNode[]): PmNode => ({ type: "listItem", content })
const doc = (...content: PmNode[]): PmNode => ({ type: "doc", content })

describe("docToMarkdown", () => {
  it("writes headings and paragraphs separated by blank lines", () => {
    const d = doc({ type: "heading", attrs: { level: 1 }, content: [t("Phase 0")] }, p(t("Sync first.")), { type: "heading", attrs: { level: 2 }, content: [t("Next")] })
    expect(docToMarkdown(d)).toBe("# Phase 0\n\nSync first.\n\n## Next\n")
  })

  it("writes inline marks and escapes Markdown characters in plain text", () => {
    const d = doc(p(t("bold", "bold"), t(" and "), t("it", "italic"), t(" "), t("x_y", "code"), t(" 2*3 #1")))
    expect(docToMarkdown(d)).toBe("**bold** and *it* `x_y` 2\\*3 \\#1\n")
  })

  it("writes links", () => {
    const d = doc(p({ type: "text", text: "site", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }))
    expect(docToMarkdown(d)).toBe("[site](https://example.com)\n")
  })

  it("writes bulleted and numbered lists, including nested ones", () => {
    const d = doc(
      { type: "bulletList", content: [li(p(t("Rice")), { type: "bulletList", content: [li(p(t("5 kg")))] }), li(p(t("Oil")))] },
      { type: "orderedList", attrs: { start: 3 }, content: [li(p(t("Three"))), li(p(t("Four")))] },
    )
    expect(docToMarkdown(d)).toBe("- Rice\n  - 5 kg\n- Oil\n\n3. Three\n4. Four\n")
  })

  it("writes checklists with their state", () => {
    const d = doc({
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { checked: true }, content: [p(t("Done one"))] },
        { type: "taskItem", attrs: { checked: false }, content: [p(t("Open one"))] },
      ],
    })
    expect(docToMarkdown(d)).toBe("- [x] Done one\n- [ ] Open one\n")
  })

  it("writes code blocks verbatim inside a fence", () => {
    const d = doc({ type: "codeBlock", attrs: { language: "ts" }, content: [t("const a = 1 * 2\n# not a heading")] })
    expect(docToMarkdown(d)).toBe("```ts\nconst a = 1 * 2\n# not a heading\n```\n")
  })

  it("writes quotes, rules and line breaks", () => {
    const d = doc({ type: "blockquote", content: [p(t("Quoted"))] }, { type: "horizontalRule" }, p(t("a"), { type: "hardBreak" }, t("b")))
    expect(docToMarkdown(d)).toBe("> Quoted\n\n---\n\na  \nb\n")
  })

  it("handles an empty document", () => {
    expect(docToMarkdown(doc())).toBe("\n")
    expect(docToMarkdown({ type: "doc" })).toBe("\n")
  })
})

describe("docToText", () => {
  it("drops Markdown syntax but keeps list and checklist markers", () => {
    const d = doc(
      { type: "heading", attrs: { level: 1 }, content: [t("Market")] },
      { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [p(t("Rice", "bold"))] }] },
      { type: "bulletList", content: [li(p(t("Oil")))] },
      { type: "codeBlock", content: [t("x * y")] },
    )
    expect(docToText(d)).toBe("Market\n\n[x] Rice\n\n• Oil\n\nx * y")
  })
})

describe("wordCount and markdownFileName", () => {
  it("counts words", () => {
    expect(wordCount("")).toBe(0)
    expect(wordCount("  one two\nthree ")).toBe(3)
  })

  it("makes a safe file name", () => {
    expect(markdownFileName("Plans: 2026/Q1?")).toBe("Plans 2026 Q1.md")
    expect(markdownFileName("   ")).toBe("Untitled.md")
  })
})
