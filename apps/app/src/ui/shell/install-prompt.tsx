import { Button, Sheet } from "@personal/ui"
import { Share, Smartphone, SquarePlus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { INSTALL_DISMISSED_KEY, shouldOfferInstall } from "./install-check"

function initiallyOpen(): boolean {
  try {
    if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return false
  } catch {
    return false
  }
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return shouldOfferInstall(navigator.userAgent, standalone)
}

function Step({ n, title, icon, children, className }: { n: number; title: string; icon: ReactNode; children: ReactNode; className: string }) {
  return (
    <div className={`flex items-start gap-3.5 ${className}`}>
      <span className="step-n" aria-hidden>
        {n}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="t-body-strong">
          {title}
          <span className="ml-1.5 inline-flex align-[-3px]" style={{ color: "var(--text-accent)" }}>
            {icon}
          </span>
        </span>
        <span className="t-meta">{children}</span>
      </span>
    </div>
  )
}

const ICON = { size: 18, strokeWidth: 2, "aria-hidden": true } as const

/** InstallPWA: after sign-in on iPhone Safari, how to add Personal to the Home Screen. Shown once. */
export function InstallPrompt() {
  const [open, setOpen] = useState(initiallyOpen)
  const dismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, new Date().toISOString())
    } catch {
      // Private mode: it shows again next time, which is fine.
    }
    setOpen(false)
  }

  return (
    <Sheet open={open} onClose={dismiss} label="Add Personal to your Home Screen" variant="panel" className="flex flex-col bg-surface">
      <div className="flex justify-end px-4 pt-3">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Skip for now
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-[22px] px-6 pt-2 pb-8">
        <div className="enter grid w-[200px] grid-cols-4 content-start gap-3 self-center p-[18px]" style={{ height: 132, borderRadius: "var(--radius-xl)", background: "var(--brand-navy)" }} aria-hidden>
          <span className="install-tile" />
          <span className="install-tile" />
          <span className="splash-mark flex flex-col items-center gap-1">
            <img src="/favicon.svg" width={36} height={36} alt="" />
          </span>
          <span className="install-tile" />
          <span className="install-tile is-dim" />
          <span className="install-tile is-dim" />
          <span className="install-tile is-dim" />
          <span className="install-tile is-dim" />
        </div>
        <div className="enter enter-1 flex flex-col gap-2">
          <h1 className="t-title1">Add Personal to your Home Screen</h1>
          <p className="t-body" style={{ color: "var(--ink-muted)" }}>
            On iPhone, reminders and offline storage only work for apps on the Home Screen. It takes 10 seconds.
          </p>
        </div>
        <div className="flex flex-col gap-[18px]">
          <Step n={1} title="Tap Share" icon={<Share {...ICON} />} className="enter enter-2">
            The square with an arrow in Safari's toolbar.
          </Step>
          <Step n={2} title="Add to Home Screen" icon={<SquarePlus {...ICON} />} className="enter enter-3">
            Scroll the share sheet and tap it, then Add.
          </Step>
          <Step n={3} title="Open Personal from your Home Screen" icon={<Smartphone {...ICON} />} className="enter enter-4">
            Sign in once there. It now works offline and can send reminders.
          </Step>
        </div>
        <div className="enter enter-5 mt-auto">
          <Button variant="primary" size="xl" block onClick={dismiss}>
            I've added it
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
