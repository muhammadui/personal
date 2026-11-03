/** Splash.dc.html: first launch only, while the session resolves. Navy, mark, wordmark, tagline. */
export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5" style={{ background: "var(--brand-navy)" }} aria-busy="true" aria-label="Personal is loading">
      <span className="splash-mark flex">
        <img src="/favicon.svg" width={88} height={88} alt="" />
      </span>
      <span className="splash-word" style={{ fontSize: 36, lineHeight: "40px", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ink-on-brand)" }}>
        Personal
      </span>
      <span className="splash-word" style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-lavender)", animationDelay: "320ms" }}>
        Notes and tasks, even offline
      </span>
      <span className="absolute inset-x-0 bottom-16 flex justify-center gap-2" aria-hidden>
        <span className="splash-loader splash-dot" />
        <span className="splash-loader splash-dot" style={{ animationDelay: "760ms" }} />
        <span className="splash-loader splash-dot" style={{ animationDelay: "920ms" }} />
      </span>
    </div>
  )
}
