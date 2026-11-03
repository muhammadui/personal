import { useEffect, useRef, useState } from "react"

const EXIT_MS = 220

/**
 * Drives a native modal <dialog>: shows it when `open` turns true, plays the exit animation
 * (220ms, see motion.md) when it turns false, then removes it.
 */
export function useOverlay(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
      return
    }
    setClosing(true)
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = window.setTimeout(() => {
      setVisible(false)
      setClosing(false)
    }, reduce ? 0 : EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!visible || !d || typeof d.showModal !== "function") return
    if (!d.open) d.showModal()
  }, [visible])

  return { ref, visible, closing }
}
