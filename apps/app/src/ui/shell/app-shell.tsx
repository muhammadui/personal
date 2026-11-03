import { useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useReminderScheduler } from "../../reminders/scheduler"
import { NotifyPermissionHost } from "../reminders/notify-permission-host"
import { TaskSheetProvider } from "../tasks/task-sheet-provider"
import { MobileTabs } from "./mobile-tabs"
import { QuickAddSheet } from "./quick-add-sheet"
import { ReminderBanner } from "./reminder-banner"
import { SessionExpiredHost } from "./session-expired-host"
import { Sidebar } from "./sidebar"
import { ToastProvider } from "./toast-provider"
import { useApplyTheme } from "./use-apply-theme"
import { VerifyHost } from "./verify-host"

/** Signed-in layout: Sidebar from 768px, TabBar with centre FAB below that. */
export function AppShell({ children }: { children: ReactNode }) {
  useApplyTheme()
  const { toast, dismissToast } = useReminderScheduler()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // The note editor has its own bottom toolbar on phones (PhoneEditor.dc.html), so no tabs there.
  const inEditor = /^\/notes\/[^/]+$/.test(pathname)
  return (
    <ToastProvider>
      <TaskSheetProvider>
        <div className="flex min-h-dvh bg-canvas">
          <Sidebar />
          <main className="min-w-0 flex-1 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(112px+env(safe-area-inset-bottom))] md:px-10 md:pt-8 md:pb-12">
            <div className="mx-auto flex max-w-[1120px] flex-col gap-4 md:gap-6">
              {toast ? <ReminderBanner key={toast.occurrenceId} toast={toast} onDismiss={dismissToast} /> : null}
              <div key={pathname} className="page-enter flex flex-col gap-4 md:gap-6">
                {children}
              </div>
            </div>
          </main>
          {inEditor ? null : <MobileTabs />}
        </div>
        <QuickAddSheet />
        <SessionExpiredHost />
        <VerifyHost />
        <NotifyPermissionHost />
      </TaskSheetProvider>
    </ToastProvider>
  )
}
