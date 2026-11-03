import { Banner, Card, Checkbox, Progress } from "@personal/ui"
import { CircleCheck } from "lucide-react"

/** FirstToday.dc.html: shown until the first task or note exists. */
export function FirstRun({ hasTask, hasNote }: { hasTask: boolean; hasNote: boolean }) {
  const steps = [
    { title: "Create your account", meta: "Done", done: true },
    { title: "Add your first task", meta: "Try “Call mum tomorrow 6pm”", done: hasTask },
    { title: "Write a note", meta: "Lists, ideas, anything", done: hasNote },
  ]
  const count = steps.filter((s) => s.done).length
  return (
    <>
      <Banner tone="success" icon={<CircleCheck aria-hidden />} className="enter enter-1">
        You're signed in. This device is ready to work offline.
      </Banner>
      <div className="enter enter-2 flex flex-col items-center gap-3 pt-5 pb-1 text-center">
        <div className="relative h-20 w-24" aria-hidden>
          <span className="absolute" style={{ left: 30, top: 2, width: 52, height: 68, borderRadius: "var(--radius-lg)", background: "var(--brand-lavender)", transform: "rotate(8deg)" }} />
          <span
            className="absolute flex flex-col gap-1.5"
            style={{ left: 14, top: 10, width: 52, height: 68, borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-md)", padding: "16px 10px" }}
          >
            <span style={{ height: 4, borderRadius: 2, background: "var(--brand-blue)" }} />
            <span style={{ height: 4, borderRadius: 2, background: "var(--brand-blue)" }} />
            <span style={{ height: 4, width: "60%", borderRadius: 2, background: "var(--brand-blue)" }} />
          </span>
        </div>
        <h2 className="t-title3">Nothing due today</h2>
        <p className="t-meta" style={{ maxWidth: 260 }}>
          Add a task or write your first note. Tap + any time.
        </p>
      </div>
      <Card className="enter enter-3 flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="t-body-strong">Get started</h2>
          <span className="t-meta" style={{ fontSize: 12 }}>
            {count} of 3
          </span>
        </div>
        <Progress value={count / 3} label="Get started" />
        <div>
          {steps.map((s, i) => (
            <div key={s.title} className={`task enter enter-${i + 4} ${s.done ? "is-done" : ""}`}>
              <Checkbox static checked={s.done} label={s.title} />
              <div className="task-body">
                <span className="task-title">{s.title}</span>
                <span className="task-meta">
                  <span className="meta-item">{s.meta}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
