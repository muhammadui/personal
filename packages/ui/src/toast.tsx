import type { ReactNode } from "react"

/** `.toast`: brand-navy, white text, optional action in brand-lavender. */
export function Toast({ icon, message, actionLabel, onAction }: { icon?: ReactNode; message: ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="toast" role="status">
      {icon}
      <span>{message}</span>
      {actionLabel ? (
        <button type="button" className="toast-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
