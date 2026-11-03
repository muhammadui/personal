import { DurableObject } from "cloudflare:workers"
import type { PulledRecord } from "@personal/core"
import type { PushSubscriptionInput } from "../app"
import { sendPush, type StoredSubscription } from "../push/send"
import { collectDue, formatTime, initialNextAt, nextAlarmAt, reminderFromRecord, type HubReminder } from "./schedule"

export type HubEnv = {
  VAPID_PRIVATE_JWK?: string
  VAPID_SUBJECT?: string
}

/**
 * One per user. Holds the user's WebSockets (hibernation, so idle sockets cost nothing),
 * the reminder schedule, the push subscriptions, and one alarm at the next due reminder.
 * Nothing here touches Postgres, so Neon can sleep (docs/architecture.md).
 */
export class UserHub extends DurableObject<HubEnv> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: HubEnv) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    // Keep-alive pings are answered without waking the object (no billed duration).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"))
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subs (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, device_id TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS acks (occurrence_id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS sent (occurrence_id TEXT PRIMARY KEY, sent_at INTEGER NOT NULL);
    `)
  }

  // --- WebSocket pokes -----------------------------------------------------------------

  override async fetch(request: Request): Promise<Response> {
    const deviceId = new URL(request.url).searchParams.get("deviceId") ?? "unknown"
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server, [deviceId.slice(0, 64)])
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === "ping") ws.send("pong")
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code, "closing")
    } catch {
      // already closed
    }
  }

  private poke(fromDeviceId: string, noteIds: string[]) {
    const msg = JSON.stringify({ type: "poke", notes: noteIds })
    for (const ws of this.ctx.getWebSockets()) {
      if (this.ctx.getTags(ws)[0] === fromDeviceId) continue
      try {
        ws.send(msg)
      } catch {
        // socket went away; hibernation API cleans it up
      }
    }
  }

  // --- RPC from the API Worker -----------------------------------------------------------

  async afterPush(info: { deviceId: string; changed: PulledRecord[]; changedNoteIds: string[] }): Promise<void> {
    const now = Date.now()
    let scheduleChanged = false
    for (const rec of info.changed) {
      if (rec.table === "reminders") {
        const base = reminderFromRecord(rec)
        const existing = this.loadReminder(rec.id)
        // Keep progress through a recurring series unless the time or rule changed.
        const keep = existing && existing.fireAt === base.fireAt && existing.rule === base.rule && existing.active === base.active
        const next: HubReminder = { ...base, nextAt: keep ? existing.nextAt : initialNextAt(base, now) }
        this.sql.exec("INSERT OR REPLACE INTO reminders (id, json) VALUES (?, ?)", rec.id, JSON.stringify(next))
        scheduleChanged = true
      } else if (rec.table === "reminder_occurrences" && rec.data.acknowledged_at) {
        this.sql.exec("INSERT OR IGNORE INTO acks (occurrence_id) VALUES (?)", rec.id)
      }
    }
    if (scheduleChanged) await this.setNextAlarm()
    this.poke(info.deviceId, info.changedNoteIds)
  }

  async subscribe(input: PushSubscriptionInput): Promise<void> {
    const { endpoint, keys } = input.subscription
    this.sql.exec(
      "INSERT OR REPLACE INTO subs (endpoint, p256dh, auth, device_id, created_at) VALUES (?, ?, ?, ?, ?)",
      endpoint,
      keys.p256dh,
      keys.auth,
      input.deviceId,
      Date.now(),
    )
  }

  async unsubscribe(endpoint: string): Promise<void> {
    this.sql.exec("DELETE FROM subs WHERE endpoint = ?", endpoint)
  }

  // --- Reminders -----------------------------------------------------------------------

  override async alarm(): Promise<void> {
    const now = Date.now()
    const reminders = this.allReminders()
    const acked = new Set(this.sql.exec<{ occurrence_id: string }>("SELECT occurrence_id FROM acks").toArray().map((r) => r.occurrence_id))
    const sent = new Set(this.sql.exec<{ occurrence_id: string }>("SELECT occurrence_id FROM sent").toArray().map((r) => r.occurrence_id))
    const { due, updated } = collectDue(reminders, acked, sent, now)
    for (const r of updated) this.sql.exec("UPDATE reminders SET json = ? WHERE id = ?", JSON.stringify(r), r.id)

    if (due.length > 0 && this.env.VAPID_PRIVATE_JWK) {
      const subs = this.sql.exec<StoredSubscription>("SELECT endpoint, p256dh, auth FROM subs").toArray()
      for (const d of due) {
        const result = await sendPush(
          subs,
          {
            title: d.reminder.title,
            body: `Reminder · ${formatTime(d.fireAt, d.reminder.timezone)}`,
            url: `/reminders/${d.occurrenceId}?reminder=${d.reminder.id}&at=${encodeURIComponent(d.fireAt)}`,
            tag: d.occurrenceId,
          },
          { privateJwk: this.env.VAPID_PRIVATE_JWK, subject: this.env.VAPID_SUBJECT ?? "mailto:muhammadbniu@gmail.com" },
        )
        for (const endpoint of result.gone) this.sql.exec("DELETE FROM subs WHERE endpoint = ?", endpoint)
        this.sql.exec("INSERT OR IGNORE INTO sent (occurrence_id, sent_at) VALUES (?, ?)", d.occurrenceId, now)
      }
    }
    // Forget bookkeeping older than 7 days.
    this.sql.exec("DELETE FROM sent WHERE sent_at < ?", now - 7 * 86_400_000)
    await this.setNextAlarm()
  }

  private async setNextAlarm() {
    const at = nextAlarmAt(this.allReminders())
    if (at === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 1000))
  }

  private allReminders(): HubReminder[] {
    return this.sql.exec<{ json: string }>("SELECT json FROM reminders").toArray().map((r) => JSON.parse(r.json) as HubReminder)
  }

  private loadReminder(id: string): HubReminder | null {
    const row = this.sql.exec<{ json: string }>("SELECT json FROM reminders WHERE id = ?", id).toArray()[0]
    return row ? (JSON.parse(row.json) as HubReminder) : null
  }
}
