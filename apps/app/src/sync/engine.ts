import {
  bytesToBase64,
  MAX_PUSH_DOC_UPDATES,
  MAX_PUSH_MUTATIONS,
  type PullResponse,
  type PushResponse,
} from "@personal/core"
import type { Store } from "../data/store"

export type SyncStatus = {
  online: boolean
  syncing: boolean
  connected: boolean
  pending: number
  lastSyncAt: number | null
  lastError: string | null
  needsSignIn: boolean
}

export type EngineOptions = {
  fetch?: typeof fetch
  baseUrl?: string
  /** Factory so tests can run without real sockets. Return null to disable. */
  openSocket?: (url: string) => WebSocket | null
  random?: () => number
  pollMs?: number
  debounceMs?: number
  /** First retry delay; doubles each attempt up to 60 s. */
  backoffBaseMs?: number
}

const MAX_BACKOFF_MS = 60_000

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

/**
 * The only code that talks to /api/sync/* (CLAUDE.md rule 1). Push outbox in order, then pull
 * until caught up. Triggers: start, online, focus, poke, local writes, 30 s polling fallback.
 */
export class SyncEngine {
  private status: SyncStatus = {
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    syncing: false,
    connected: false,
    pending: 0,
    lastSyncAt: null,
    lastError: null,
    needsSignIn: false,
  }
  private listeners = new Set<() => void>()
  private running: Promise<void> | null = null
  private again = false
  private attempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private socket: WebSocket | null = null
  private socketRetry = 0
  private stopped = true
  private cleanups: (() => void)[] = []
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string
  private readonly random: () => number
  private readonly pollMs: number
  private readonly debounceMs: number
  private readonly backoffBaseMs: number

  constructor(
    private readonly store: Store,
    private readonly opts: EngineOptions = {},
  ) {
    this.fetchImpl = opts.fetch ?? ((...a) => fetch(...a))
    this.baseUrl = opts.baseUrl ?? ""
    this.random = opts.random ?? Math.random
    this.pollMs = opts.pollMs ?? 30_000
    this.debounceMs = opts.debounceMs ?? 500
    this.backoffBaseMs = opts.backoffBaseMs ?? 1000
  }

  getStatus = (): SyncStatus => this.status
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch }
    for (const fn of this.listeners) fn()
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    const kick = () => void this.syncNow()
    const online = () => {
      this.set({ online: true })
      this.openSocket()
      kick()
    }
    const offline = () => this.set({ online: false })
    const visible = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") kick()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", online)
      window.addEventListener("offline", offline)
      window.addEventListener("focus", kick)
      document.addEventListener("visibilitychange", visible)
      this.cleanups.push(() => {
        window.removeEventListener("online", online)
        window.removeEventListener("offline", offline)
        window.removeEventListener("focus", kick)
        document.removeEventListener("visibilitychange", visible)
      })
    }
    this.cleanups.push(this.store.onLocalWrite(() => this.scheduleSoon()))
    this.pollTimer = setInterval(() => {
      if (!this.status.connected) kick()
    }, this.pollMs)
    this.openSocket()
    void this.refreshPending()
    kick()
  }

  stop(): void {
    this.stopped = true
    for (const c of this.cleanups.splice(0)) c()
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.socket?.close()
    this.socket = null
  }

  private scheduleSoon() {
    void this.refreshPending()
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => void this.syncNow(), this.debounceMs)
  }

  private async refreshPending() {
    try {
      this.set({ pending: await this.store.pendingCount() })
    } catch (e) {
      // After stop() (sign-out, tests) the local database may already be closed.
      if (!this.stopped) console.error("Could not count pending changes", e)
    }
  }

  /** Run one full sync. Concurrent calls coalesce into one follow-up run. */
  syncNow(): Promise<void> {
    if (this.status.needsSignIn) return Promise.resolve()
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = (async () => {
      do {
        this.again = false
        await this.runOnce()
      } while (this.again && !this.stopped)
    })().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async runOnce(): Promise<void> {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.set({ syncing: true })
    try {
      await this.pushAll()
      await this.pullAll()
      this.attempt = 0
      const now = Date.now()
      await this.store.db.sync_state.put({ key: "last_sync_at", value: now })
      this.set({ lastSyncAt: now, lastError: null, online: true })
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) {
        this.set({ needsSignIn: true, lastError: "Signed out. Sign in again to sync." })
      } else {
        const message = e instanceof Error ? e.message : String(e)
        this.set({ lastError: message })
        this.scheduleRetry()
      }
    } finally {
      await this.refreshPending()
      this.set({ syncing: false })
    }
  }

  /** Exponential backoff with jitter: 1 s, 2 s, 4 s … capped at 60 s. */
  backoffDelay(attempt: number): number {
    const base = Math.min(MAX_BACKOFF_MS, this.backoffBaseMs * 2 ** attempt)
    return Math.round(base * (0.5 + this.random() * 0.5))
  }

  private scheduleRetry() {
    if (this.stopped) return
    const delay = this.backoffDelay(this.attempt++)
    this.retryTimer = setTimeout(() => void this.syncNow(), delay)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new HttpError(res.status, `Sync failed (${res.status})`)
    return (await res.json()) as T
  }

  private async pushAll(): Promise<void> {
    const { db } = this.store
    for (let round = 0; round < 1000; round++) {
      const entries = await db.outbox.orderBy("seq").limit(MAX_PUSH_MUTATIONS).toArray()
      const docs = await db.doc_outbox.orderBy("seq").limit(MAX_PUSH_DOC_UPDATES).toArray()
      if (entries.length === 0 && docs.length === 0) return
      const body = {
        deviceId: this.store.deviceId,
        mutations: entries.map((e) => e.mutation),
        docUpdates: docs.map((d) => ({
          id: d.id,
          noteId: d.note_id,
          update: bytesToBase64(d.update),
          ...(d.compacts_up_to !== undefined ? { compactsUpTo: d.compacts_up_to } : {}),
        })),
      }
      const res = await this.request<PushResponse>("/api/sync/push", { method: "POST", body: JSON.stringify(body) })
      const done = new Set([...res.applied, ...res.duplicates, ...res.rejected.map((r) => r.id)])
      // Rows in doc_updates are never rewritten (binary payloads); "pending" = present in doc_outbox.
      await db.transaction("rw", [db.outbox, db.doc_outbox], async () => {
        await db.outbox.bulkDelete(entries.filter((e) => done.has(e.mutation.id)).map((e) => e.seq as number))
        await db.doc_outbox.bulkDelete(docs.filter((d) => done.has(d.id)).map((d) => d.seq as number))
      })
      if (res.rejected.length > 0) await this.noteRejections(res.rejected.length)
      // Nothing acknowledged means the server could not process the batch; stop and retry later.
      if (done.size === 0) throw new Error("Server accepted nothing")
    }
  }

  private async noteRejections(count: number) {
    // Logged and shown as a sync notice; never blocks later mutations (docs/sync.md).
    console.warn(`${count} change(s) were rejected by the server`)
    await this.store.create("notifications", {
      kind: "sync",
      title: count === 1 ? "1 change could not be saved" : `${count} changes could not be saved`,
      body: "The server refused them as invalid. Everything else synced.",
      link: null,
      read_at: null,
      occurrence_id: null,
    })
  }

  private async pullAll(): Promise<void> {
    for (let page = 0; page < 10_000; page++) {
      const since = await this.store.cursor()
      const res = await this.request<PullResponse>(`/api/sync/pull?since=${since}&limit=1000`)
      await this.store.applyRemote(res.changes, res.docs, res.cursor)
      if (!res.hasMore) return
    }
  }

  // --- WebSocket pokes -------------------------------------------------------------------

  private openSocket() {
    if (this.stopped || this.socket || typeof location === "undefined") return
    const proto = location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${proto}//${location.host}/api/ws?deviceId=${encodeURIComponent(this.store.deviceId)}`
    const ws = this.opts.openSocket ? this.opts.openSocket(url) : new WebSocket(url)
    if (!ws) return
    this.socket = ws
    let ping: ReturnType<typeof setInterval> | null = null
    ws.onopen = () => {
      this.socketRetry = 0
      this.set({ connected: true })
      ping = setInterval(() => ws.readyState === 1 && ws.send("ping"), 45_000)
      void this.syncNow()
    }
    ws.onmessage = (ev) => {
      if (typeof ev.data === "string" && ev.data.startsWith("{")) void this.syncNow()
    }
    ws.onclose = () => {
      if (ping) clearInterval(ping)
      this.socket = null
      this.set({ connected: false })
      if (this.stopped || this.status.needsSignIn) return
      const delay = this.backoffDelay(this.socketRetry++)
      setTimeout(() => this.openSocket(), delay)
    }
    ws.onerror = () => ws.close()
  }
}
