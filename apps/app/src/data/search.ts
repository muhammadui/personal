import MiniSearch from "minisearch"
import type { PersonalDb } from "./db"

/**
 * Offline full-text search over note titles and text, task titles and notes, and tags
 * (docs/sync.md "Local store"). The index lives in memory: it is rebuilt from IndexedDB on
 * start and refreshed whenever notes, tasks or tags change.
 */
export type SearchDoc = {
  key: string
  kind: "note" | "task"
  id: string
  title: string
  text: string
  tags: string
  done: boolean
}

export type SearchHit = { kind: "note" | "task"; id: string; title: string; snippet: string; done: boolean; score: number }

function createIndex() {
  return new MiniSearch<SearchDoc>({
    idField: "key",
    fields: ["title", "text", "tags"],
    storeFields: ["kind", "id", "title", "text", "done"],
    searchOptions: { boost: { title: 3, tags: 2 }, prefix: true, fuzzy: 0.2, combineWith: "AND" },
  })
}

export async function buildSearchDocs(db: PersonalDb): Promise<SearchDoc[]> {
  const [notes, tasks, tags, noteTags, taskTags] = await Promise.all([
    db.notes.toArray(),
    db.tasks.toArray(),
    db.tags.toArray(),
    db.note_tags.toArray(),
    db.task_tags.toArray(),
  ])
  const tagName = new Map(tags.filter((t) => !t.deleted_at).map((t) => [t.id, t.name]))
  const tagsFor = (links: { tag_id: string; deleted_at?: string | null }[]) =>
    links.filter((l) => !l.deleted_at).map((l) => tagName.get(l.tag_id)).filter(Boolean).join(" ")
  const docs: SearchDoc[] = []
  for (const n of notes) {
    if (n.deleted_at) continue
    docs.push({
      key: `note:${n.id}`,
      kind: "note",
      id: n.id,
      title: n.title || "Untitled",
      // Locked notes keep plain_text empty, so their content never enters the index.
      text: n.locked ? "" : (n.plain_text ?? ""),
      tags: tagsFor(noteTags.filter((l) => l.note_id === n.id)),
      done: false,
    })
  }
  for (const t of tasks) {
    if (t.deleted_at) continue
    docs.push({
      key: `task:${t.id}`,
      kind: "task",
      id: t.id,
      title: t.title,
      text: t.notes ?? "",
      tags: tagsFor(taskTags.filter((l) => l.task_id === t.id)),
      done: t.status === "done",
    })
  }
  return docs
}

function snippet(text: string, query: string): string {
  const flat = text.replace(/\s+/g, " ").trim()
  if (!flat) return ""
  const first = query.trim().split(/\s+/)[0]?.toLowerCase() ?? ""
  const at = first ? flat.toLowerCase().indexOf(first) : -1
  const start = Math.max(0, at - 40)
  const out = flat.slice(start, start + 140)
  return (start > 0 ? "…" : "") + out + (start + 140 < flat.length ? "…" : "")
}

export class SearchIndex {
  private index = createIndex()

  load(docs: SearchDoc[]): void {
    this.index = createIndex()
    this.index.addAll(docs)
  }

  search(query: string, limit = 30): SearchHit[] {
    if (!query.trim()) return []
    return this.index
      .search(query)
      .slice(0, limit)
      .map((r) => ({
        kind: r.kind as "note" | "task",
        id: r.id as string,
        title: r.title as string,
        snippet: snippet((r.text as string) ?? "", query),
        done: Boolean(r.done),
        score: r.score,
      }))
  }
}
