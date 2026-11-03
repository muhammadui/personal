import { BrandMark } from "../brand-mark"

/** Navy left panel of AuthDesktop.dc.html (1024px and wider). */
export function AuthAside() {
  return (
    <section className="relative hidden min-w-0 flex-[1_1_520px] flex-col gap-10 overflow-hidden px-14 py-12 lg:flex" style={{ background: "var(--brand-navy)", color: "var(--ink-on-brand)" }}>
      <BrandMark size={36} wordClass="text-[22px]" />
      <div className="enter mt-auto flex max-w-[460px] flex-col gap-4">
        <h1 className="t-display" style={{ color: "var(--ink-on-brand)" }}>
          Your notes and tasks, on every device
        </h1>
        <p className="t-body-lg" style={{ color: "var(--brand-lavender)" }}>
          Write on your laptop, finish on your phone. Everything works offline and syncs the moment you're back.
        </p>
      </div>
      <div className="enter enter-2 flex items-end gap-4" aria-hidden>
        <span className="flex w-[200px] flex-col gap-2.5 p-4" style={{ borderRadius: "var(--radius-lg)", background: "rgba(255,255,255,.08)" }}>
          <span style={{ font: "700 11px/14px var(--font-sans)", letterSpacing: ".06em", color: "var(--brand-lavender)" }}>TODAY</span>
          <span style={{ height: 8, borderRadius: 2, background: "rgba(255,255,255,.3)" }} />
          <span style={{ height: 8, width: "70%", borderRadius: 2, background: "rgba(255,255,255,.3)" }} />
          <span style={{ height: 8, width: "85%", borderRadius: 2, background: "rgba(255,255,255,.3)" }} />
        </span>
        <span className="flex h-[170px] w-[150px] flex-col gap-2 p-4" style={{ borderRadius: "var(--radius-lg)", background: "var(--brand-blue)" }}>
          <span style={{ height: 8, borderRadius: 2, background: "rgba(255,255,255,.55)" }} />
          <span style={{ height: 8, width: "70%", borderRadius: 2, background: "rgba(255,255,255,.55)" }} />
        </span>
        <span className="h-[120px] w-[96px]" style={{ borderRadius: "var(--radius-lg)", background: "var(--brand-lavender)", transform: "rotate(8deg)" }} />
      </div>
    </section>
  )
}
