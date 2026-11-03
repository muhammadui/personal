import { BrandMark } from "./brand-mark"

/** First paint while the local session opens: the mark and wordmark, nothing else. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas" aria-busy="true">
      <span className="splash-mark">
        <BrandMark size={56} wordmark={false} />
      </span>
      <span className="splash-word t-title3">Personal</span>
    </div>
  )
}
