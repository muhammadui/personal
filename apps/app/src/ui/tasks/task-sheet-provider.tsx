import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { TaskSheet } from "./task-sheet"

type Ctx = { openTask: (id: string) => void; openId: string | null }
const TaskSheetContext = createContext<Ctx | null>(null)

/** Holds the task detail panel so any row, banner or page can open a task. */
export function TaskSheetProvider({ children }: { children: ReactNode }) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const openTask = useCallback((id: string) => setTaskId(id), [])
  const value = useMemo(() => ({ openTask, openId: taskId }), [openTask, taskId])
  return (
    <TaskSheetContext.Provider value={value}>
      {children}
      <TaskSheet taskId={taskId} onClose={() => setTaskId(null)} onOpenTask={setTaskId} />
    </TaskSheetContext.Provider>
  )
}

export function useTaskSheet(): Ctx {
  const ctx = useContext(TaskSheetContext)
  if (!ctx) throw new Error("useTaskSheet outside TaskSheetProvider")
  return ctx
}
