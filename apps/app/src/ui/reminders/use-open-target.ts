import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { useTaskSheet } from "../tasks/task-sheet-provider"

/** Open the task or note a reminder points at. */
export function useOpenTarget(): (type: "task" | "note", id: string) => void {
  const navigate = useNavigate()
  const { openTask } = useTaskSheet()
  return useCallback(
    (type, id) => {
      if (type === "note") void navigate({ to: "/notes/$noteId", params: { noteId: id } })
      else openTask(id)
    },
    [navigate, openTask],
  )
}
