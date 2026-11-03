import { PinDots, PinPad } from "@personal/ui"
import { useNavigate } from "@tanstack/react-router"
import { ChevronLeft, Lock } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import type { Stored } from "../../data/db"
import { unlockNote, WrongPinError } from "../../sync/note-lock"
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "./pin-length"

/** PhoneLocked: the note's title and a PIN pad. Nothing of the body is shown until the PIN is right. */
export function LockedNote({ note, onUnlock }: { note: Stored<"notes">; onUnlock: (key: CryptoKey) => void }) {
  const navigate = useNavigate()
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = useCallback((next: string) => {
    setError(null)
    setPin(next)
  }, [])

  // The PIN can be 4 to 8 digits and its length isn't stored, so the user taps OK (or Enter).
  const [attempt, setAttempt] = useState<string | null>(null)
  const submit = useCallback(() => {
    if (pin.length >= MIN_PIN_LENGTH) setAttempt(pin)
  }, [pin])

  useEffect(() => {
    if (attempt === null) return
    let live = true
    setBusy(true)
    unlockNote(note, attempt).then(
      (key) => {
        if (live) onUnlock(key)
      },
      (e: unknown) => {
        if (!live) return
        setAttempt(null)
        setBusy(false)
        setPin("")
        if (e instanceof WrongPinError) setError("Wrong PIN. Try again.")
        else {
          console.error("Could not unlock note", e)
          setError("Couldn't unlock this note. Try again.")
        }
      },
    )
    return () => {
      live = false
    }
  }, [attempt, note, onUnlock])

  return (
    <div className="-mx-5 -mt-4 flex min-h-[calc(100dvh-128px-env(safe-area-inset-top))] flex-col bg-surface md:mx-auto md:mt-0 md:min-h-0 md:w-full md:max-w-[420px] md:rounded-lg md:border md:border-line">
      <header className="flex items-center px-2 pt-2 pb-2">
        <button type="button" className="btn btn-ghost" style={{ padding: "0 8px", gap: 2, color: "var(--text-accent)" }} onClick={() => void navigate({ to: "/notes" })}>
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          Notes
        </button>
      </header>
      <div className="flex flex-1 flex-col items-center gap-5 px-7 pt-4 pb-9 text-center">
        <span className="tile tile-navy enter" style={{ width: 64, height: 64, flexBasis: 64, borderRadius: "var(--radius-lg)" }}>
          <Lock size={28} strokeWidth={2} aria-hidden />
        </span>
        <div className="enter enter-1 flex flex-col gap-1.5">
          <h1 className="t-title2">{note.title || "Locked note"}</h1>
          <p className="t-meta">This note is locked. Enter your PIN, then tap the check.</p>
        </div>
        <PinDots count={pin.length} length={Math.max(MIN_PIN_LENGTH, pin.length)} className="enter enter-2" />
        {error ? (
          <p role="alert" className="field-error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
        <PinPad
          value={pin}
          onChange={change}
          length={MAX_PIN_LENGTH}
          disabled={busy}
          onEnter={pin.length >= MIN_PIN_LENGTH ? submit : undefined}
          submitLabel="Unlock"
          className="enter enter-3 mt-auto w-full md:mt-4"
        />
        <p className="t-meta" style={{ fontSize: 12 }}>
          Forgot the PIN? Locked notes can't be recovered without it.
        </p>
      </div>
    </div>
  )
}
