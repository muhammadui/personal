import type { Store } from "../../data/store"

/** Delete a list and its tasks (both go to Trash). */
export async function deleteList(store: Store, listId: string): Promise<void> {
  const tasks = await store.db.tasks.where("list_id").equals(listId).toArray()
  for (const t of tasks) if (!t.deleted_at) await store.remove("tasks", t.id)
  await store.remove("lists", listId)
}

/** Restore a list and the tasks that were deleted with it. */
export async function restoreList(store: Store, listId: string): Promise<void> {
  const list = await store.db.lists.get(listId)
  const deletedAt = list?.deleted_at ? new Date(list.deleted_at).getTime() : null
  await store.restore("lists", listId)
  if (deletedAt === null) return
  const tasks = await store.db.tasks.where("list_id").equals(listId).toArray()
  for (const t of tasks) {
    if (t.deleted_at && Math.abs(new Date(t.deleted_at).getTime() - deletedAt) < 10_000) await store.restore("tasks", t.id)
  }
}
