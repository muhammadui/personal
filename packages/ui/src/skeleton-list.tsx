/** Loading rows that pulse (1.4s). Only for first sign-in on a device. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="list" style={{ padding: "8px 0" }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ padding: "12px 16px" }}>
          <span className="skeleton" style={{ width: 20, height: 20, borderRadius: "var(--radius-sm)" }} />
          <span className="flex flex-1 flex-col gap-2">
            <span className="skeleton" style={{ height: 12 }} />
            <span className="skeleton" style={{ height: 12, width: "50%" }} />
          </span>
        </div>
      ))}
    </div>
  )
}
