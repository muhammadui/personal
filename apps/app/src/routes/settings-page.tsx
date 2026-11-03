import { Avatar, Badge, buttonClass, Card, Field, SectionLabel, SegmentedControl, SelectInput, SyncStatus } from "@personal/ui"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useMemo } from "react"
import { useSession } from "../data/session"
import { useNow } from "../ui/hooks/use-now"
import { useSettings } from "../ui/hooks/use-settings"
import { PageHeader } from "../ui/page-header"
import { DevicesSection } from "../ui/settings/devices-section"
import { NotificationsSection } from "../ui/settings/notifications-section"
import { saveSettings } from "../ui/settings/save-settings"
import { SignOutButton } from "../ui/settings/sign-out-button"
import { SyncPanel } from "../ui/settings/sync-panel"
import { applyTheme, type ThemeChoice } from "../ui/settings/theme"
import { useSyncLabel } from "../ui/shell/use-sync-label"
import { BackLink } from "../ui/back-link"

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

/** PhoneSettings / Settings. */
export function SettingsPage() {
  const { user, store } = useSession()
  const { settings, timeZone } = useSettings()
  const now = useNow()
  const sync = useSyncLabel()
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone")
    } catch {
      return [timeZone]
    }
  }, [timeZone])
  const theme = settings?.theme ?? "system"

  return (
    <>
      <BackLink to="/" label="Today" />
      <PageHeader title="Settings" />
      <div className="flex max-w-[720px] flex-col gap-6">
        <Card className="enter enter-1 flex items-center gap-3 p-3.5">
          <Avatar name={user.name || user.email} size={44} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="t-body-strong truncate">{user.name || "Your account"}</span>
            <span className="t-meta flex flex-wrap items-center gap-2" style={{ fontSize: 12 }}>
              {user.email}
              {user.emailVerified ? <Badge tone="success">VERIFIED</Badge> : <Badge tone="warn">NOT VERIFIED</Badge>}
            </span>
          </span>
          <SyncStatus state={sync.state} label={sync.state === "ok" ? "Synced" : sync.label} />
        </Card>

        <section className="enter enter-2 flex flex-col gap-2">
          <SectionLabel>Appearance</SectionLabel>
          <SegmentedControl
            label="Theme"
            value={theme}
            options={THEMES}
            onChange={(value) => {
              applyTheme(value)
              void saveSettings(store, user.id, settings, { theme: value })
            }}
          />
        </section>

        <section className="enter enter-3 flex flex-col gap-2">
          <SectionLabel>Time and date</SectionLabel>
          <Field label="Time zone" htmlFor="tz" hint="Due dates and reminders use this time zone.">
            <SelectInput id="tz" value={timeZone} onChange={(e) => void saveSettings(store, user.id, settings, { timezone: e.target.value })}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
        </section>

        <div className="enter enter-4">
          <NotificationsSection />
        </div>

        <section className="enter enter-5 flex flex-col gap-2">
          <Link to="/lists" className={buttonClass("secondary", "lg", true)} style={{ justifyContent: "space-between" }}>
            Lists
            <ChevronRight size={18} strokeWidth={2} aria-hidden />
          </Link>
        </section>

        <section className="enter enter-6 flex flex-col gap-3">
          <SectionLabel>Sync and devices</SectionLabel>
          <SyncPanel timeZone={timeZone} />
          <DevicesSection now={now} timeZone={timeZone} />
        </section>

        <SignOutButton />
      </div>
    </>
  )
}
