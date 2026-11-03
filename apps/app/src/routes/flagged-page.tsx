import { EmptyState } from "@personal/ui"
import { Flag } from "lucide-react"
import { flaggedTasks } from "../data/queries"
import { useStore } from "../data/session"
import { useLiveQuery } from "../data/use-live-query"
import { BackLink } from "../ui/back-link"
import { HeaderStatus } from "../ui/header-status"
import { useNow } from "../ui/hooks/use-now"
import { useTimeZone } from "../ui/hooks/use-time-zone"
import { PageHeader } from "../ui/page-header"
import { TaskList } from "../ui/tasks/task-list"

export function FlaggedPage() {
  const store = useStore()
  const timeZone = useTimeZone()
  const now = useNow()
  const tasks = useLiveQuery(() => flaggedTasks(store.db), [store], null)
  return (
    <>
      <BackLink to="/search" label="Search" />
      <PageHeader title="Flagged" actions={<HeaderStatus />} />
      {tasks && tasks.length === 0 ? (
        <EmptyState icon={<Flag size={24} strokeWidth={2} aria-hidden />} title="No flagged tasks">
          Flag a task in its details to keep it here.
        </EmptyState>
      ) : null}
      {tasks && tasks.length > 0 ? <TaskList tasks={tasks} now={now} timeZone={timeZone} showList /> : null}
    </>
  )
}
