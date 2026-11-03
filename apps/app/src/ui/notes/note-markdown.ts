/**
 * Turn a note's ProseMirror JSON (Tiptap `editor.getJSON()`) into Markdown or plain text,
 * for "Copy as text" and "Download as Markdown" (PhoneExport.dc.html).
 * Covers what the editor can make: paragraphs, headings, bold, italic, strike, inline code,
 * links, bulleted, numbered and checklists (nested), code blocks, quotes, rules and line breaks.
 */
export type PmMark = { type: string; attrs?: Record<string, unknown> }
export type PmNode = { type: string; attrs?: Record<string, unknown>; content?: PmNode[]; text?: string; marks?: PmMark[] }

type Mode = "markdown" | "text"

const MD_SPECIAL = /([\\`*_[\]#<>~|])/g

function escapeMd(text: string): string {
  return text.replace(MD_SPECIAL, "\\$1")
}

function inline(nodes: PmNode[] | undefined, mode: Mode): string {
  if (!nodes) return ""
  let out = ""
  for (const n of nodes) {
    if (n.type === "hardBreak") {
      out += mode === "markdown" ? "  \n" : "\n"
      continue
    }
    if (n.type !== "text" || !n.text) {
      out += inline(n.content, mode)
      continue
    }
    if (mode === "text") {
      out += n.text
      continue
    }
    const marks = new Set((n.marks ?? []).map((m) => m.type))
    if (marks.has("code")) {
      const fence = n.text.includes("`") ? "``" : "`"
      out += `${fence}${n.text}${fence}`
      continue
    }
    let t = escapeMd(n.text)
    if (marks.has("bold")) t = `**${t}**`
    if (marks.has("italic")) t = `*${t}*`
    if (marks.has("strike")) t = `~~${t}~~`
    const link = n.marks?.find((m) => m.type === "link")
    if (link && typeof link.attrs?.href === "string") t = `[${t}](${link.attrs.href})`
    out += t
  }
  return out
}

function indent(text: string, by: string): string {
  return text
    .split("\n")
    .map((line) => (line ? by + line : line))
    .join("\n")
}

/** A list item: first block on the marker line, the rest (nested lists, more paragraphs) indented under it. */
function listItem(item: PmNode, marker: string, mode: Mode): string {
  const [first, ...rest] = item.content ?? []
  const head = first ? block(first, mode) : ""
  const pad = " ".repeat(marker.length + 1)
  const tail = rest.map((b) => indent(block(b, mode), pad)).join("\n")
  return `${marker} ${indent(head, pad).slice(pad.length)}${tail ? `\n${tail}` : ""}`
}

function block(node: PmNode, mode: Mode): string {
  switch (node.type) {
    case "paragraph":
      return inline(node.content, mode)
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6)
      const text = inline(node.content, mode)
      return mode === "markdown" ? `${"#".repeat(level)} ${text}` : text
    }
    case "bulletList":
      return (node.content ?? []).map((li) => listItem(li, mode === "markdown" ? "-" : "•", mode)).join("\n")
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1) || 1
      return (node.content ?? []).map((li, i) => listItem(li, `${start + i}.`, mode)).join("\n")
    }
    case "taskList":
      return (node.content ?? [])
        .map((li) => {
          const checked = li.attrs?.checked === true
          return listItem(li, mode === "markdown" ? (checked ? "- [x]" : "- [ ]") : checked ? "[x]" : "[ ]", mode)
        })
        .join("\n")
    case "codeBlock": {
      const code = (node.content ?? []).map((t) => t.text ?? "").join("")
      if (mode === "text") return code
      const lang = typeof node.attrs?.language === "string" ? node.attrs.language : ""
      const fence = code.includes("```") ? "````" : "```"
      return `${fence}${lang}\n${code}\n${fence}`
    }
    case "blockquote": {
      const inner = blocks(node.content, mode)
      return mode === "markdown" ? inner.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n") : inner
    }
    case "horizontalRule":
      return mode === "markdown" ? "---" : "———"
    default:
      return node.content ? blocks(node.content, mode) : inline([node], mode)
  }
}

function blocks(nodes: PmNode[] | undefined, mode: Mode): string {
  return (nodes ?? []).map((n) => block(n, mode)).join("\n\n")
}

export function docToMarkdown(doc: PmNode): string {
  return blocks(doc.content, "markdown").trim() + "\n"
}

export function docToText(doc: PmNode): string {
  return blocks(doc.content, "text").trim()
}

/** Words in the note, for the "412 words" line. */
export function wordCount(text: string): number {
  const words = text.trim().match(/\S+/g)
  return words ? words.length : 0
}

/** A safe file name from the note title. */
export function markdownFileName(title: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return `${base || "Untitled"}.md`
}
