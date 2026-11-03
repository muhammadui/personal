import { base64ToBytes } from "@personal/core"
import { Button, Dialog, EmptyState, Sheet } from "@personal/ui"
import { ChevronLeft, History, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import * as Y from "yjs"
import type { Stored } from "../../data/db"
import type { Store } from "../../data/store"
import { useLiveQuery } from "../../data/use-live-query"
import { docPlainText } from "../../sync/note-docs"
import { restoreVersion, versionsFor } from "../../sync/note-versions"
import { relativeTime, timeLabel } from "../format"
import { useNow } from "../hooks/use-now"
import { useToast } from "../shell/toast-provider"
import { wordDiff } from "./word-diff"

type Props = { open: boolean; onClose: () => void; store: Store; noteId: string; title: string; doc: Y.Doc | null; timeZone: string }

const REASON: Record<Stored<"note_versions">["reason"], string> = { hourly: "Autosave", restore: "Before a restore", manual: "Saved" }

function versionText(version: Stored<"note_versions">): string {
  const d = new Y.Doc()
  Y.applyUpdate(d, base64ToBytes(version.snapshot))
  const text = docPlainText(d)
  d.destroy()
  return text
}

/** PhoneHistory: pick a saved version, see what changed since, restore it. */
export function VersionHistory({ open, onClose, store, noteId, title, doc, timeZone }: Props) {
  const now = useNow()
  const { showToast } = useToast()
  const versions = useLiveQuery(() => versionsFor(store, noteId), [store, noteId], null)
  const [picked, setPicked] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const selected = versions?.find((v) => v.id === picked) ?? versions?.[0] ?? null
  // The live text is read when the panel opens or the selection changes.
  const diff = useMemo(() => (selected && open && doc ? wordDiff(versionText(selected), docPlainText(doc)) : null), [selected, open, doc])

  const when = (v: Stored<"note_versions">) => {
    const rel = relativeTime(v.created_at, now, timeZone)
    return rel.includes("ago") || rel === "Just now" ? `Today, ${timeLabel(v.created_at, timeZone)}` : `${rel}, ${timeLabel(v.created_at, timeZone)}`
  }

  const restore = async () => {
    if (!selected || !doc) return
    setBusy(true)
    try {
      await restoreVersion(store, noteId, doc, selected)
      showToast({ message: "Version restored" })
      setConfirming(false)
      onClose()
    } catch (e) {
      console.error("Could not restore version", e)
      showToast({ message: "Couldn't restore that version" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Version history" variant="panel">
      <header className="flex items-center gap-1 px-2 pt-2 pb-2">
        <button type="button" className="btn btn-ghost" style={{ padding: "0 8px", gap: 2, color: "var(--text-accent)" }} onClick={onClose}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          Note
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-5 pt-1 pb-6">
        <div className="enter">
          <h1 className="t-title2">Version history</h1>
          <p className="t-meta">{title || "Untitled"}</p>
        </div>
        {versions && versions.length === 0 ? (
          <EmptyState icon={<History size={24} strokeWidth={2} aria-hidden />} title="No earlier versions yet">
            A version is saved at most once an hour while you edit.
          </EmptyState>
        ) : null}
        {versions && versions.length > 0 ? (
          <>
            <div className="enter enter-1 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Versions">
              {versions.map((v) => (
                <button key={v.id} type="button" className="version-pick" aria-pressed={selected?.id === v.id} onClick={() => setPicked(v.id)}>
                  <span className="version-when">{when(v)}</span>
                  <span className="version-dev">{REASON[v.reason]}</span>
                </button>
              ))}
            </div>
            {selected ? (
              <article className="card enter enter-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-[18px]" style={{ background: "var(--canvas)" }}>
                <span className="t-label">Changes since {when(selected)}</span>
                <p className="t-body whitespace-pre-wrap" style={{ color: "var(--ink-secondary)", lineHeight: "24px" }}>
                  {diff
                    ? diff.map((p, i) =>
                        p.kind === "same" ? (
                          <span key={i}>{p.text}</span>
                        ) : p.kind === "added" ? (
                          <ins key={i} className="diff-added">
                            {p.text}
                          </ins>
                        ) : (
                          <del key={i} className="diff-removed">
                            {p.text}
                          </del>
                        ),
                      )
                    : versionText(selected)}
                </p>
                {diff ? (
                  <span className="t-meta mt-auto flex gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="ldot" style={{ background: "var(--success)" }} />
                      Added
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="ldot" style={{ background: "var(--danger)" }} />
                      Removed
                    </span>
                  </span>
                ) : null}
              </article>
            ) : null}
            <Button variant="primary" size="xl" block className="enter enter-3" disabled={!selected || !doc} onClick={() => setConfirming(true)}>
              <RotateCcw size={18} strokeWidth={2} aria-hidden />
              Restore this version
            </Button>
            <p className="t-meta text-center" style={{ fontSize: 12 }}>
              The current version is kept, so you can undo a restore.
            </p>
          </>
        ) : null}
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Restore this version?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="primary" busy={busy} onClick={() => void restore()}>
              Restore
            </Button>
          </>
        }
      >
        The note goes back to how it was {selected ? when(selected).toLowerCase() : ""}. The current version is saved first.
      </Dialog>
    </Sheet>
  )
}
