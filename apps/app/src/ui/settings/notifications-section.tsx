import { Banner, List, SectionLabel, Switch } from "@personal/ui"
import { Bell, Clock, Info, Vibrate } from "lucide-react"
import { useState } from "react"
import { useSession } from "../../data/session"
import { usePushNotifications } from "../../push/use-push"
import { haptic, hapticsEnabled, setHapticsEnabled } from "../haptics"
import { useSettings } from "../hooks/use-settings"
import { saveSettings } from "./save-settings"

const isIos = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent)

/** Reminder notifications: a switch that asks the browser, and plain help when it can't. */
export function NotificationsSection() {
  const push = usePushNotifications()
  const { user, store } = useSession()
  const { settings } = useSettings()
  const [vibration, setVibration] = useState(hapticsEnabled)
  const defaultTime = settings?.default_reminder_time ?? "09:00"
  const on = push.status === "subscribed"
  const canAsk = push.status === "ready"
  const detail =
    push.status === "subscribed"
      ? "On for this device."
      : push.status === "checking"
        ? "Checking…"
        : push.status === "ready"
          ? "Off. Reminders only show inside the app."
          : null

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Notifications</SectionLabel>
      <List>
        <div className="task" style={{ minHeight: 52 }}>
          <span className="flex" style={{ color: "var(--ink-muted)" }}>
            <Bell size={20} strokeWidth={2} aria-hidden />
          </span>
          <span className="task-body">
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Reminders
            </span>
            {detail ? <span className="task-meta">{detail}</span> : null}
          </span>
          <Switch label="Reminder notifications" checked={on} disabled={!canAsk && !on} onChange={(next) => (next && canAsk ? void push.enable() : undefined)} />
        </div>
        <div className="task" style={{ minHeight: 52 }}>
          <span className="flex" style={{ color: "var(--ink-muted)" }}>
            <Vibrate size={20} strokeWidth={2} aria-hidden />
          </span>
          <span className="task-body">
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Vibration
            </span>
            <span className="task-meta">On this device, for taps and in-app reminders.</span>
          </span>
          <Switch
            label="Vibration"
            checked={vibration}
            onChange={(next) => {
              setHapticsEnabled(next)
              setVibration(next)
              if (next) haptic("success")
            }}
          />
        </div>
        <div className="task" style={{ minHeight: 52 }}>
          <span className="flex" style={{ color: "var(--ink-muted)" }}>
            <Clock size={20} strokeWidth={2} aria-hidden />
          </span>
          <label className="task-body" htmlFor="default-reminder-time">
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Default reminder time
            </span>
            <span className="task-meta">Used when a date has no time.</span>
          </label>
          <input
            id="default-reminder-time"
            type="time"
            className="input"
            style={{ width: 128, height: 40 }}
            value={defaultTime}
            onChange={(e) => {
              const m = /^(\d{2}:\d{2})/.exec(e.target.value)
              if (m) void saveSettings(store, user.id, settings, { default_reminder_time: m[1]! })
            }}
          />
        </div>
      </List>
      {push.status === "denied" ? (
        <Banner tone="info" icon={<Info aria-hidden />} title="Notifications are off">
          Reminders will only show inside the app. Turn them on in your browser settings.
        </Banner>
      ) : push.status === "unsupported" && isIos() ? (
        <Banner tone="info" icon={<Info aria-hidden />} title="Notifications need the Home Screen app">
          On iPhone, add Personal to your Home Screen to get notifications.
        </Banner>
      ) : push.status === "unsupported" || push.status === "unavailable" ? (
        <Banner tone="info" icon={<Info aria-hidden />} title="Notifications aren't available here">
          Reminders still show inside the app and in the bell.
        </Banner>
      ) : push.status === "error" ? (
        <Banner tone="warn" icon={<Info aria-hidden />} title="Couldn't turn on notifications">
          Try again in a moment. Reminders still show inside the app.
        </Banner>
      ) : null}
    </section>
  )
}
