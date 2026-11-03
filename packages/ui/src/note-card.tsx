import type { ReactNode } from "react"
import { cx } from "./cx"
import type { RenderLink } from "./render-link"

export type NoteColour = "plain" | "lilac" | "sand" | "mint" | "blue" | "navy"

export type NoteCardProps = {
  title: ReactNode
  preview?: ReactNode
  meta?: ReactNode
  /** Small line above the title (folder, kind) and an optional icon on its right. */
  eyebrow?: ReactNode
  eyebrowIcon?: ReactNode
  colour?: NoteColour
  compact?: boolean
  render?: RenderLink
}

/** `.note-card`: title-3 title, up to 3 lines of preview, meta at the bottom. */
export function NoteCard({ title, preview, meta, eyebrow, eyebrowIcon, colour = "plain", compact = false, render }: NoteCardProps) {
  const className = cx("note-card", colour !== "plain" && `note-${colour}`)
  const children = (
    <>
      {eyebrow || eyebrowIcon ? (
        <span className="t-meta flex justify-between" style={{ fontSize: 12, color: colour === "blue" || colour === "navy" ? "var(--brand-lavender)" : undefined }}>
          <span>{eyebrow}</span>
          {eyebrowIcon}
        </span>
      ) : null}
      <span className={compact ? "t-body-strong" : "t-title3"}>{title}</span>
      {preview ? <span className="note-preview">{preview}</span> : null}
      {meta ? <span className="note-meta">{meta}</span> : null}
    </>
  )
  const style = compact ? { minHeight: 0 } : undefined
  if (render) return <>{render({ className: cx(className, compact && "min-h-0"), children })}</>
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
