import { Badge, Button, List, SectionLabel } from "@personal/ui"
import { Laptop, Smartphone } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { authClient } from "../../lib/auth-client"
import { relativeTime, summariseUserAgent } from "../format"

type DeviceSession = { token: string; userAgent?: string | null; updatedAt: Date | string; createdAt: Date | string }

/** Signed-in devices from the auth server, with Sign out per device (Settings.dc.html). */
export function DevicesSection({ now, timeZone }: { now: Date; timeZone: string }) {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null)
  const [currentToken, setCurrentToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [list, current] = await Promise.all([authClient.listSessions(), authClient.getSession()])
      if (list.error) {
        setError(list.error.status ? "Could not load your devices." : "Devices show when you're online.")
        return
      }
      setError(null)
      setSessions((list.data ?? []) as DeviceSession[])
      setCurrentToken(current.data?.session.token ?? null)
    } catch {
      setError("Devices show when you're online.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = async (token: string) => {
    const res = await authClient.revokeSession({ token })
    if (res.error) setError("Could not sign that device out. Try again.")
    else void load()
  }

  const sorted = [...(sessions ?? [])].sort((a, b) => Number(b.token === currentToken) - Number(a.token === currentToken) || String(b.updatedAt).localeCompare(String(a.updatedAt)))

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Devices</SectionLabel>
        {sessions ? <span className="t-meta">{sessions.length} signed in</span> : null}
      </div>
      {error ? <p className="t-meta">{error}</p> : null}
      {sessions ? (
        <List>
          {sorted.map((s) => {
            const name = summariseUserAgent(s.userAgent)
            const mobile = /iPhone|Android|iPad/.test(s.userAgent ?? "")
            const isThis = s.token === currentToken
            return (
              <div key={s.token} className="task flex-wrap" style={{ minHeight: 64, padding: "12px 16px" }}>
                <span className="tile">{mobile ? <Smartphone size={18} strokeWidth={2} aria-hidden /> : <Laptop size={18} strokeWidth={2} aria-hidden />}</span>
                <span className="task-body">
                  <span className="flex items-center gap-2">
                    <span className="t-body-strong">{name}</span>
                    {isThis ? <Badge tone="accent">THIS DEVICE</Badge> : null}
                  </span>
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {isThis ? "Active now" : `Last active ${relativeTime(new Date(s.updatedAt).toISOString(), now, timeZone).replace(/^Just now$/, "just now")}`}
                  </span>
                </span>
                {!isThis ? (
                  <Button size="sm" onClick={() => void revoke(s.token)}>
                    Sign out
                  </Button>
                ) : null}
              </div>
            )
          })}
        </List>
      ) : null}
      <p className="t-meta" style={{ fontSize: 12 }}>
        Signing a device out stops it syncing. Its copy of your notes is removed when it next signs out.
      </p>
    </section>
  )
}
