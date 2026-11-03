import { newId, toDeviceId } from "@personal/core"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { authClient, currentUser, type AuthUser } from "../lib/auth-client"
import { SyncEngine, type SyncStatus } from "../sync/engine"
import { PersonalDb, deleteLocalData } from "./db"
import { purgeLocalTombstones, updateWaitingNotice } from "./maintenance"
import { Store } from "./store"

const LAST_USER_KEY = "personal.user"

export type Session = { user: AuthUser; store: Store; engine: SyncEngine; stopMaintenance: () => void }
type State = { status: "loading" } | { status: "signed-out" } | { status: "ready"; session: Session }

type Ctx = {
  state: State
  startSession: (user: AuthUser) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const SessionContext = createContext<Ctx | null>(null)

function readLastUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

async function openSession(user: AuthUser): Promise<Session> {
  const db = new PersonalDb(user.id)
  await db.open()
  let deviceId = (await db.sync_state.get("device_id"))?.value as string | undefined
  if (!deviceId) {
    deviceId = toDeviceId(newId())
    await db.sync_state.put({ key: "device_id", value: deviceId })
  }
  const store = new Store(db, deviceId)
  const engine = new SyncEngine(store)
  engine.start()
  localStorage.setItem(LAST_USER_KEY, JSON.stringify(user))
  // Ask the browser not to evict local data (docs/sync.md "Storage persistence").
  void navigator.storage?.persist?.().catch(() => false)
  const maintain = () => {
    void updateWaitingNotice(store, navigator.onLine).catch((e: unknown) => console.error("Waiting notice failed", e))
  }
  void purgeLocalTombstones(store).catch((e: unknown) => console.error("Local purge failed", e))
  const timer = setInterval(maintain, 60_000)
  const unsubscribe = engine.subscribe(maintain)
  return {
    user,
    store,
    engine,
    stopMaintenance: () => {
      clearInterval(timer)
      unsubscribe()
    },
  }
}

/**
 * Offline-first session: if this device has signed in before, open local data immediately
 * and check the server session in the background (docs/auth.md "Offline behaviour").
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" })
  const current = useRef<Session | null>(null)

  const startSession = useCallback(async (user: AuthUser) => {
    if (current.current?.user.id === user.id) {
      current.current.engine.stop()
      current.current.engine.start()
      return
    }
    current.current?.engine.stop()
    current.current?.stopMaintenance()
    const session = await openSession(user)
    current.current = session
    setState({ status: "ready", session })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const last = readLastUser()
      if (last) {
        await startSession(last)
        const remote = await currentUser()
        if (!cancelled && remote && remote !== "offline") localStorage.setItem(LAST_USER_KEY, JSON.stringify(remote))
        return
      }
      const remote = await currentUser()
      if (cancelled) return
      if (remote && remote !== "offline") await startSession(remote)
      else setState({ status: "signed-out" })
    })()
    return () => {
      cancelled = true
    }
  }, [startSession])

  const refreshUser = useCallback(async () => {
    const remote = await currentUser()
    if (remote && remote !== "offline" && current.current) {
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(remote))
      const session = { ...current.current, user: remote }
      current.current = session
      setState({ status: "ready", session })
    }
  }, [])

  const signOut = useCallback(async () => {
    const session = current.current
    await authClient.signOut().catch(() => undefined)
    if (session) {
      session.stopMaintenance()
      session.engine.stop()
      session.store.db.close()
      await deleteLocalData(session.user.id)
    }
    localStorage.removeItem(LAST_USER_KEY)
    current.current = null
    setState({ status: "signed-out" })
  }, [])

  const value = useMemo(() => ({ state, startSession, signOut, refreshUser }), [state, startSession, signOut, refreshUser])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): Ctx {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSessionContext outside SessionProvider")
  return ctx
}

/** The signed-in session. Only use inside screens that render after sign-in. */
export function useSession(): Session {
  const { state } = useSessionContext()
  if (state.status !== "ready") throw new Error("No session")
  return state.session
}

export function useStore(): Store {
  return useSession().store
}

export function useSyncStatus(): SyncStatus {
  const { engine } = useSession()
  return useSyncExternalStore(engine.subscribe, engine.getStatus, engine.getStatus)
}
