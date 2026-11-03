import { Banner, Button, PinDots, PinPad, Sheet } from "@personal/ui"
import { TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { PIN_LENGTH } from "./pin-length"

type Step = "first" | "again"

/** Lock note: choose a PIN, enter it again, then lock. Warns that a forgotten PIN can't be recovered. */
export function LockSheet({ open, onClose, onLock }: { open: boolean; onClose: () => void; onLock: (pin: string) => Promise<void> }) {
  const [step, setStep] = useState<Step>("first")
  const [first, setFirst] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep("first")
    setFirst("")
    setPin("")
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (pin.length < PIN_LENGTH || step !== "first") return
    setFirst(pin)
    setPin("")
    setStep("again")
  }, [pin, step])

  const lock = async () => {
    if (pin !== first) {
      setError("The PINs don't match. Try again.")
      setPin("")
      return
    }
    setBusy(true)
    try {
      await onLock(pin)
    } catch (e) {
      console.error("Could not lock note", e)
      setError("Couldn't lock this note. Try again.")
      setBusy(false)
    }
  }

  const restart = () => {
    setStep("first")
    setFirst("")
    setPin("")
    setError(null)
  }

  const ready = step === "again" && pin.length === PIN_LENGTH

  return (
    <Sheet open={open} onClose={busy ? () => undefined : onClose} label="Lock note">
      <div className="flex flex-col gap-1.5">
        <h2 className="t-title3">{step === "first" ? "Choose a PIN" : "Enter the PIN again"}</h2>
        <p className="t-meta">{step === "first" ? `Pick ${PIN_LENGTH} digits. You'll need them to open this note on any device.` : "So we know you remember it."}</p>
      </div>
      <Banner tone="warn" icon={<TriangleAlert aria-hidden />}>
        If you forget this PIN, the note can't be recovered.
      </Banner>
      <PinDots count={pin.length} length={PIN_LENGTH} className="py-1" />
      {error ? (
        <p role="alert" className="field-error text-center" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      <PinPad
        value={pin}
        onChange={(v) => {
          setError(null)
          setPin(v)
        }}
        length={PIN_LENGTH}
        disabled={busy}
        keyboard={open}
        onEnter={ready ? () => void lock() : undefined}
      />
      <Button variant="primary" size="xl" block disabled={!ready} busy={busy} onClick={() => void lock()}>
        {busy ? "Locking…" : "Lock note"}
      </Button>
      <Button variant="ghost" size="lg" block disabled={busy} onClick={step === "again" ? restart : onClose}>
        {step === "again" ? "Start over" : "Cancel"}
      </Button>
    </Sheet>
  )
}
