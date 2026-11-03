import { useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { useTaskSheet } from "../tasks/task-sheet-provider"

/** Open what a reminder points at: its task or note, or a standalone reminder's edit sheet. */
export function useOpenTarget(): (type: "task" | "note" | "standalone", id: string) => void {
  const navigate = useNavigate()
  const { openTask } = useTaskSheet()
  return useCallback(
    (type, id) => {
      if (type === "note") void navigate({ to: "/notes/$noteId", params: { noteId: id } })
      else if (type === "standalone") void navigate({ to: "/reminders", search: { edit: id } })
      else openTask(id)
    },
    [navigate, openTask],
  )
}
