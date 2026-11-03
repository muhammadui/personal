import { Button } from "@personal/ui"
import { ArrowRight } from "lucide-react"
import { useState, type ReactNode } from "react"
import { SceneNotes, SceneOffline, SceneReminders } from "./onboarding-scenes"

export type OnboardingEnd = "sign-up" | "sign-in"

type Step = { scene: ReactNode; title: string; body: string }

const STEPS: Step[] = [
  { scene: <SceneNotes />, title: "Notes and tasks, together", body: "Write freely, then turn any line into a task with a date. Everything lives in one place." },
  {
    scene: <SceneOffline />,
    title: "Works without the internet",
    body: "No network, no problem. Everything saves on your device first and syncs to your other devices when you're back online.",
  },
  { scene: <SceneReminders />, title: "Reminders that find you", body: "Set a time once and it reaches you on whichever device you're using. Done on one clears it everywhere." },
]

/** Onboard1–3 at /welcome, first launch only. Skip and the last step lead to sign up. */
export function Onboarding({ onDone }: { onDone: (next: OnboardingEnd) => void }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]!
  const last = step === STEPS.length - 1

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
          <img src="/favicon.svg" width={28} height={28} alt="Personal" />
          <Button variant="ghost" size="sm" onClick={() => onDone("sign-up")}>
            Skip
          </Button>
        </div>
        <div key={step} className="flex flex-1 items-center justify-center overflow-hidden px-7 py-4">
          {s.scene}
        </div>
        <div className="flex flex-col gap-4 px-7 pb-[calc(env(safe-area-inset-bottom)+40px)]">
          <div className="dots" role="img" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`dot-i ${i === step ? "is-on" : ""}`} />
            ))}
          </div>
          <div key={`text-${step}`} className="flex flex-col gap-4" aria-live="polite">
            <h1 className="t-title1 enter">{s.title}</h1>
            <p className="t-body enter enter-2" style={{ color: "var(--ink-secondary)", fontSize: 16, lineHeight: "24px" }}>
              {s.body}
            </p>
          </div>
          {last ? (
            <>
              <Button variant="primary" size="xl" block className="mt-2" onClick={() => onDone("sign-up")}>
                Create your account
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </Button>
              <Button variant="ghost" size="lg" block onClick={() => onDone("sign-in")}>
                I already have an account
              </Button>
            </>
          ) : (
            <Button variant="primary" size="xl" block className="mt-2" onClick={() => setStep(step + 1)}>
              Next
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
