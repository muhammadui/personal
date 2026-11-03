import { Toast } from "@personal/ui"
import { CircleCheck } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

export type ToastInput = { message: string; actionLabel?: string; onAction?: () => void }
type Ctx = { showToast: (t: ToastInput) => void }
const ToastContext = createContext<Ctx | null>(null)

/** One toast at a time: 4s, or 5s when it has an action (motion.md). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const showToast = useCallback((t: ToastInput) => {
    window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ ...t, id })
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), t.actionLabel ? 5000 : 4000)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const value = useMemo(() => ({ showToast }), [showToast])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast ? (
          <Toast
            key={toast.id}
            icon={<CircleCheck size={18} strokeWidth={2} aria-hidden />}
            message={toast.message}
            {...(toast.actionLabel
              ? {
                  actionLabel: toast.actionLabel,
                  onAction: () => {
                    toast.onAction?.()
                    setToast(null)
                  },
                }
              : {})}
          />
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast outside ToastProvider")
  return ctx
}
