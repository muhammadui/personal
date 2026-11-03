import { cx } from "@personal/ui"

/** Stand-in logo: the exported mark file plus the wordmark. Never redrawn (README "Logo"). */
export function BrandMark({ size = 30, wordmark = true, className, wordClass }: { size?: number; wordmark?: boolean; className?: string; wordClass?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <img src="/favicon.svg" width={size} height={size} alt="" className="block" />
      {wordmark ? (
        <span className={wordClass} style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Personal
        </span>
      ) : null}
    </span>
  )
}
