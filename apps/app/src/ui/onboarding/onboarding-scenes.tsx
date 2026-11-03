import { Bell, CalendarClock, CloudCheck, CloudOff, Globe, Laptop, Monitor, MoveRight, Smartphone } from "lucide-react"

const TICK = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

function Item({ done = false, children }: { done?: boolean; children: string }) {
  return (
    <span className="t-body flex items-center gap-2.5">
      <span className={`check ${done ? "is-on" : ""}`} style={{ margin: 0, width: 20, height: 20, flex: "0 0 20px", pointerEvents: "none" }}>
        <span className="check-box">{TICK}</span>
      </span>
      <span style={done ? { textDecoration: "line-through", color: "var(--ink-faint)" } : undefined}>{children}</span>
    </span>
  )
}

/** Onboard1: a note whose line became a task. */
export function SceneNotes() {
  return (
    <div className="relative" style={{ width: 300, height: 330 }} aria-hidden>
      <div className="card scene absolute flex flex-col gap-2.5" style={{ left: 0, top: 10, width: 250, padding: 18, boxShadow: "var(--shadow-md)" }}>
        <span className="t-meta" style={{ fontSize: 12 }}>
          Personal · note
        </span>
        <span className="t-title3">Saturday market</span>
        <Item done>Rice, 5 kg</Item>
        <Item>Tomatoes and pepper</Item>
        <Item>Groundnut oil</Item>
      </div>
      <div
        className="scene scene-2 absolute flex flex-col gap-1.5"
        style={{ right: 0, top: 186, width: 230, padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "var(--brand-blue)", color: "var(--ink-on-brand)", boxShadow: "var(--shadow-lg)" }}
      >
        <span style={{ font: "700 12px/16px var(--font-sans)", color: "var(--brand-lavender)" }}>Task · from your note</span>
        <span style={{ font: "700 15px/20px var(--font-sans)" }}>Buy tomatoes and pepper</span>
        <span className="flex items-center gap-1.5" style={{ font: "600 12px/16px var(--font-sans)", color: "var(--brand-lavender)" }}>
          <CalendarClock size={14} strokeWidth={2} />
          Sat, 8:00 am
        </span>
      </div>
      <div className="scene scene-3 absolute" style={{ left: 24, top: 268, width: 44, height: 56, borderRadius: "var(--radius-md)", background: "var(--brand-lavender)", transform: "rotate(-8deg)" }} />
    </div>
  )
}

/** Onboard2: saved offline on the phone, synced later. */
export function SceneOffline() {
  return (
    <div className="relative" style={{ width: 300, height: 330 }} aria-hidden>
      <div
        className="scene absolute flex flex-col gap-2"
        style={{ left: 8, top: 20, width: 150, height: 250, borderRadius: "var(--radius-xl)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)", padding: "14px 12px" }}
      >
        <span className="pill-status pill-warn" style={{ height: 26, padding: "0 8px", fontSize: 11 }}>
          <CloudOff size={14} strokeWidth={2} />
          Offline
        </span>
        <span style={{ height: 28, borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)" }} />
        <span style={{ height: 28, borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)" }} />
        <span className="flex items-center" style={{ height: 28, borderRadius: "var(--radius-sm)", background: "var(--tint-blue)", padding: "0 8px", font: "700 11px/1 var(--font-sans)", color: "var(--text-accent)" }}>
          + New task saved
        </span>
        <span className="mt-auto" style={{ font: "700 11px/14px var(--font-sans)", color: "var(--ink-muted)" }}>
          2 changes on this phone
        </span>
      </div>
      <div className="scene scene-2 absolute flex flex-col items-center gap-1.5" style={{ left: 150, top: 118, width: 60, color: "var(--brand-blue)" }}>
        <MoveRight size={24} strokeWidth={2} />
        <span className="text-center" style={{ font: "700 10px/12px var(--font-sans)", color: "var(--ink-muted)" }}>
          syncs when back online
        </span>
      </div>
      <div className="scene scene-3 absolute flex flex-col gap-1.5" style={{ right: 0, top: 80, width: 96, height: 150 }}>
        <span className="flex items-center justify-center" style={{ height: 66, borderRadius: "var(--radius-md)", background: "var(--brand-navy)", color: "var(--brand-lavender)" }}>
          <Laptop size={24} strokeWidth={2} />
        </span>
        <span className="flex items-center justify-center" style={{ height: 66, borderRadius: "var(--radius-md)", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink-muted)" }}>
          <Smartphone size={24} strokeWidth={2} />
        </span>
        <span className="sync sync-ok justify-center" style={{ fontSize: 11 }}>
          <CloudCheck size={14} strokeWidth={2} />
          Synced
        </span>
      </div>
    </div>
  )
}

/** Onboard3: a reminder that reaches every device. */
export function SceneReminders() {
  return (
    <div className="relative" style={{ width: 310, height: 300 }} aria-hidden>
      <div className="scene scene-3 absolute" style={{ left: 28, right: 28, top: 20, height: 80, borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", opacity: 0.6 }} />
      <div className="scene scene-2 absolute" style={{ left: 14, right: 14, top: 36, height: 86, borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }} />
      <div className="scene absolute flex flex-col gap-3" style={{ left: 0, right: 0, top: 56, padding: 16, borderRadius: "var(--radius-lg)", background: "var(--brand-navy)", color: "var(--ink-on-brand)", boxShadow: "var(--shadow-lg)" }}>
        <span className="flex items-center gap-2.5">
          <span className="tile-onbrand" style={{ width: 32, height: 32, flexBasis: 32 }}>
            <Bell size={16} strokeWidth={2} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span style={{ font: "700 11px/14px var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--brand-lavender)" }}>Reminder · 2:00 pm</span>
            <span style={{ font: "700 15px/20px var(--font-sans)" }}>Send the draft report</span>
          </span>
        </span>
        <span className="flex gap-2">
          <span className="btn btn-inverse btn-sm flex-1">Done</span>
          <span className="btn btn-outline-inverse btn-sm flex-1">Snooze 15 min</span>
        </span>
      </div>
      <div className="scene scene-4 absolute flex justify-center gap-3" style={{ left: 0, right: 0, top: 228 }}>
        <span className="tag tag-outline" style={{ height: 30, gap: 6 }}>
          <Monitor size={14} strokeWidth={2} />
          Mac
        </span>
        <span className="tag tag-outline" style={{ height: 30, gap: 6 }}>
          <Smartphone size={14} strokeWidth={2} />
          iPhone
        </span>
        <span className="tag tag-outline" style={{ height: 30, gap: 6 }}>
          <Globe size={14} strokeWidth={2} />
          Browser
        </span>
      </div>
    </div>
  )
}
