import { ids, newId } from "@personal/core"
import { afterEach, describe, expect, it } from "vitest"
import { SyncEngine } from "../sync/engine"
import { FakeSyncServer } from "../sync/fake-server"
import { acknowledgeOccurrence, addTask, completeTask, setReminder } from "./actions"
import { PersonalDb, deleteLocalData } from "./db"
import { endOfLocalDay, startOfLocalDay, todayTasks } from "./queries"
import { Store } from "./store"

const cleanup: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const c of cleanup.splice(0)) await c()
})

function device(server: FakeSyncServer, name: string) {
  const dbName = `${newId()}-${name}`
  const db = new PersonalDb(dbName)
  const store = new Store(db, name)
  const engine = new SyncEngine(store, { fetch: server.fetch, openSocket: () => null })
  cleanup.push(async () => {
    db.close()
    await deleteLocalData(dbName)
  })
  return { db, store, engine }
}

const TZ = "Africa/Lagos"

describe("recurring tasks", () => {
  it("completing creates the next occurrence from the previous due date", async () => {
    const { store, db } = device(new FakeSyncServer(), "solo")
    const id = await addTask(store, { title: "Water plants", dueAt: "2026-11-03T08:00:00.000Z", dueHasTime: true, recurrenceRule: "FREQ=DAILY" })
    await completeTask(store, (await db.tasks.get(id))!, TZ)
    const nextId = ids.nextRecurringTask(id, "2026-11-04T08:00:00.000Z")
    const next = await db.tasks.get(nextId)
    expect(next).toMatchObject({ title: "Water plants", status: "open", due_at: "2026-11-04T08:00:00.000Z", series_id: id })
  })

  it("two devices ticking the same task offline create the next one only once", async () => {
    const server = new FakeSyncServer()
    const laptop = device(server, "laptop")
    const phone = device(server, "phone")
    const id = await addTask(laptop.store, { title: "Weekly review", dueAt: "2026-11-02T16:00:00.000Z", dueHasTime: true, recurrenceRule: "FREQ=WEEKLY" })
    await laptop.engine.syncNow()
    await phone.engine.syncNow()

    server.offline = true
    await completeTask(laptop.store, (await laptop.db.tasks.get(id))!, TZ)
    await completeTask(phone.store, (await phone.db.tasks.get(id))!, TZ)
    server.offline = false
    await laptop.engine.syncNow()
    await phone.engine.syncNow()
    await laptop.engine.syncNow()

    for (const d of [laptop, phone]) {
      const open = (await d.db.tasks.toArray()).filter((t) => t.status === "open")
      expect(open).toHaveLength(1)
      expect(open[0]?.due_at).toBe("2026-11-09T16:00:00.000Z")
    }
  })
})

describe("reminders", () => {
  it("Done on a task reminder acknowledges the occurrence and ticks the task", async () => {
    const { store, db } = device(new FakeSyncServer(), "solo")
    const taskId = await addTask(store, { title: "Pay bill" })
    const reminderId = await setReminder(store, { type: "task", id: taskId, title: "Pay bill" }, "2026-11-03T15:00:00.000Z", TZ)
    const reminder = (await db.reminders.get(reminderId))!
    await acknowledgeOccurrence(store, reminder, reminder.fire_at, "done", { timeZone: TZ })
    const occ = await db.reminder_occurrences.get(ids.reminderOccurrence(reminderId, reminder.fire_at))
    expect(occ?.acknowledged_action).toBe("done")
    expect((await db.tasks.get(taskId))?.status).toBe("done")
    expect((await db.reminders.get(reminderId))?.status).toBe("done")
  })

  it("snooze creates a one-off reminder at the snooze time", async () => {
    const { store, db } = device(new FakeSyncServer(), "solo")
    const taskId = await addTask(store, { title: "Call mum" })
    const reminderId = await setReminder(store, { type: "task", id: taskId, title: "Call mum" }, "2026-11-03T15:00:00.000Z", TZ)
    const reminder = (await db.reminders.get(reminderId))!
    await acknowledgeOccurrence(store, reminder, reminder.fire_at, "snoozed", { timeZone: TZ, snoozeUntil: "2026-11-03T15:15:00.000Z" })
    const scheduled = (await db.reminders.toArray()).filter((r) => r.status === "scheduled")
    expect(scheduled.map((r) => r.fire_at)).toEqual(["2026-11-03T15:15:00.000Z"])
  })
})

describe("today", () => {
  it("uses the user's timezone for the day boundary", async () => {
    const now = new Date("2026-11-03T22:30:00.000Z") // 23:30 in Lagos, still 3 Nov
    expect(startOfLocalDay(now, TZ).toISOString()).toBe("2026-11-02T23:00:00.000Z")
    expect(endOfLocalDay(now, TZ).toISOString()).toBe("2026-11-03T22:59:59.999Z")
    const { store, db } = device(new FakeSyncServer(), "solo")
    await addTask(store, { title: "late tonight", dueAt: "2026-11-03T22:45:00.000Z", dueHasTime: true })
    await addTask(store, { title: "tomorrow", dueAt: "2026-11-03T23:30:00.000Z", dueHasTime: true })
    await addTask(store, { title: "yesterday", dueAt: "2026-11-02T10:00:00.000Z", dueHasTime: true })
    const { overdue, today } = await todayTasks(db, now, TZ)
    expect(today.map((t) => t.title)).toEqual(["late tonight"])
    expect(overdue.map((t) => t.title)).toEqual(["yesterday"])
  })
})
