import { Button, Sheet } from "@personal/ui"
import { Bell, Check } from "lucide-react"
import { useEffect, useState } from "react"
import { usePushNotifications } from "../../push/use-push"
import { timeLabel } from "../format"
import { useTimeZone } from "../hooks/use-time-zone"
import { onUi } from "../shell/events"
import { markPushAsked, pushAsked } from "./push-asked"

/** NotifyPermission sheet: shown once, after the first reminder is set, when the browser can ask. */
export function NotifyPermissionHost() {
  const push = usePushNotifications()
  const timeZone = useTimeZone()
  const [preview, setPreview] = useState<{ title: string; fireAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const status = push.status

  useEffect(
    () =>
      onUi((e) => {
        if (e.type !== "notify-prompt") return
        if (status !== "ready" || pushAsked()) return
        markPushAsked()
        setPreview({ title: e.title, fireAt: e.fireAt })
      }),
    [status],
  )

  const close = () => setPreview(null)

  return (
    <Sheet open={preview !== null} onClose={close} label="Allow notifications" className="flex flex-col gap-[18px] px-6">
      {preview ? (
        <>
          <div className="enter mt-2 flex items-center gap-3 p-4" style={{ borderRadius: "var(--radius-lg)", background: "var(--brand-navy)", color: "var(--ink-on-brand)", boxShadow: "var(--shadow-md)" }}>
            <span className="tile-onbrand">
              <Bell size={24} strokeWidth={2} aria-hidden />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex justify-between" style={{ font: "700 12px/16px var(--font-sans)", color: "var(--brand-lavender)" }}>
                <span>PERSONAL</span>
                <span>{timeLabel(preview.fireAt, timeZone)}</span>
              </span>
              <span style={{ font: "700 15px/20px var(--font-sans)" }}>{preview.title}</span>
              <span style={{ font: "600 13px/18px var(--font-sans)", color: "var(--brand-lavender)" }}>Tap to open · Done · Snooze</span>
            </span>
          </div>
          <div className="enter enter-1 flex flex-col gap-2">
            <h2 className="t-title2">Get your reminder on time</h2>
            <p className="t-body" style={{ color: "var(--ink-secondary)" }}>
              You just set your first reminder. Allow notifications so it reaches you even when Personal is closed.
            </p>
          </div>
          <div className="enter enter-2 flex flex-col gap-2.5">
            <span className="t-meta flex items-center gap-2">
              <Check size={16} strokeWidth={2} aria-hidden />
              Only for reminders you set and sync problems
            </span>
            <span className="t-meta flex items-center gap-2">
              <Check size={16} strokeWidth={2} aria-hidden />
              Snooze from the notification or in the app
            </span>
          </div>
          <div className="enter enter-3 mt-1 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="xl"
              block
              busy={busy}
              onClick={() => {
                setBusy(true)
                void push.enable().finally(() => {
                  setBusy(false)
                  close()
                })
              }}
            >
              Turn on notifications
            </Button>
            <Button variant="ghost" size="lg" block onClick={close}>
              Not now
            </Button>
          </div>
          <p className="t-meta text-center" style={{ fontSize: 12 }}>
            If you skip, reminders still show in the app's bell.
          </p>
        </>
      ) : null}
    </Sheet>
  )
}
