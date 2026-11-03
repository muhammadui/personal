import type { ReactNode } from "react"

/** Page title block: optional meta line above (date), title-1 on phones and display on desktop. */
export function PageHeader({ eyebrow, title, actions, className }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={`enter flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`}>
      <div className="flex min-w-0 flex-col gap-0.5 md:gap-1">
        {eyebrow ? <span className="t-meta">{eyebrow}</span> : null}
        <h1 className="m-0 text-title-1 md:text-display">{title}</h1>
      </div>
      {actions ? <div className="flex items-center gap-2.5">{actions}</div> : null}
    </header>
  )
}
