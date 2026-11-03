import { Chip, Field, List, RowButton, SelectInput, Switch, TextInput } from "@personal/ui"
import { BellRing, Repeat } from "lucide-react"
import { useState } from "react"
import { repeatShort } from "../tasks/repeat-options"
import { RepeatSheet } from "../tasks/repeat-sheet"
import {
  CUSTOM_MAX,
  EARLY_PRESETS,
  NAG_COUNTS,
  NAG_EVERY,
  TITLE_MISSING,
  alertSummary,
  draftAlertsBefore,
  draftFireAt,
  draftProblem,
  type ReminderDraft,
} from "./reminder-draft"

type Props = {
  value: ReminderDraft
  onChange: (next: ReminderDraft) => void
  timeZone: string
  now: Date
  autoFocus?: boolean
  /** Enter in the title field. */
  onSubmit?: () => void
}

const withValue = (options: number[], v: number) =>
  options.includes(v) ? options : [...options, v].sort((a, b) => a - b)

/** The standalone reminder fields, shared by quick add and the edit sheet. */
export function ReminderForm({
  value: d,
  onChange,
  timeZone,
  now,
  autoFocus = false,
  onSubmit,
}: Props) {
  const [repeatOpen, setRepeatOpen] = useState(false)
  const set = (patch: Partial<ReminderDraft>) => onChange({ ...d, ...patch })
  const problem = draftProblem(d, now, timeZone)
  const timeProblem = problem && problem !== TITLE_MISSING ? problem : null
  const fireAt = timeProblem ? null : draftFireAt(d, timeZone)
  const summary = fireAt
    ? alertSummary(
        fireAt,
        draftAlertsBefore(d),
        d.nag ? d.nagEvery : null,
        d.nag ? d.nagCount : null,
        timeZone,
      )
    : null

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="reminder-title">
          What should I remind you about?
        </label>
        <textarea
          id="reminder-title"
          autoFocus={autoFocus}
          rows={2}
          maxLength={500}
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSubmit?.()
            }
          }}
          placeholder="What should I remind you about?"
          className="inline-input resize-none"
          style={{ font: "700 22px/32px var(--font-sans)", minHeight: 64, color: "var(--ink)" }}
        />
      </div>
      <Field label="Details (optional)" htmlFor="reminder-body">
        <textarea
          id="reminder-body"
          rows={3}
          maxLength={2000}
          value={d.body}
          onChange={(e) => set({ body: e.target.value })}
          className="input resize-none"
          style={{ height: "auto", padding: "12px 14px", lineHeight: "22px" }}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Day" htmlFor="reminder-date">
            <TextInput
              id="reminder-date"
              type="date"
              required
              value={d.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </Field>
          <Field label="Time" htmlFor="reminder-time">
            <TextInput
              id="reminder-time"
              type="time"
              required
              value={d.time}
              onChange={(e) => set({ time: e.target.value })}
            />
          </Field>
        </div>
        <span
          className={`t-meta fade-in flex items-start gap-1.5 ${timeProblem ? "t-warn" : ""}`}
          key={summary ?? timeProblem ?? "none"}
          aria-live="polite"
        >
          <BellRing size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          {timeProblem ?? summary}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="t-label">Early alerts</span>
        <div className="flex flex-wrap gap-2">
          {EARLY_PRESETS.map((p) => {
            const on = d.before.includes(p.minutes)
            return (
              <Chip
                key={p.minutes}
                on={on}
                onClick={() =>
                  set({
                    before: on ? d.before.filter((m) => m !== p.minutes) : [...d.before, p.minutes],
                  })
                }
              >
                {p.label}
              </Chip>
            )
          })}
          <Chip
            on={d.custom !== null}
            onClick={() => set({ custom: d.custom === null ? "" : null })}
          >
            Custom
          </Chip>
        </div>
        {d.custom !== null ? (
          <div className="fade-in">
            <Field
              label="Minutes before"
              htmlFor="reminder-custom"
              hint={`1 to ${CUSTOM_MAX} minutes.`}
            >
              <TextInput
                id="reminder-custom"
                type="number"
                inputMode="numeric"
                min={1}
                max={CUSTOM_MAX}
                step={1}
                placeholder="45"
                value={d.custom}
                onChange={(e) => set({ custom: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </div>
      <List>
        <div className="task" style={{ minHeight: 52 }}>
          <span className="task-body">
            <span className="t-body-strong" style={{ fontWeight: 600 }}>
              Remind again until I tap Done
            </span>
          </span>
          <Switch
            label="Remind again until I tap Done"
            checked={d.nag}
            onChange={(nag) => set({ nag })}
          />
        </div>
        {d.nag ? (
          <div className="task fade-in flex-wrap" style={{ minHeight: 52, gap: 8 }}>
            <label className="t-meta" htmlFor="reminder-nag-every">
              Every
            </label>
            <SelectInput
              id="reminder-nag-every"
              className="w-auto"
              style={{ height: 36 }}
              value={d.nagEvery}
              onChange={(e) => set({ nagEvery: Number(e.target.value) })}
            >
              {withValue(NAG_EVERY, d.nagEvery).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </SelectInput>
            <SelectInput
              id="reminder-nag-count"
              aria-label="How many more times"
              className="w-auto"
              style={{ height: 36 }}
              value={d.nagCount}
              onChange={(e) => set({ nagCount: Number(e.target.value) })}
            >
              {withValue(NAG_COUNTS, d.nagCount).map((n) => (
                <option key={n} value={n}>
                  {n} more {n === 1 ? "time" : "times"}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
        <RowButton
          icon={<Repeat size={20} strokeWidth={2} aria-hidden />}
          label="Repeat"
          value={repeatShort(d.rule)}
          onClick={() => setRepeatOpen(true)}
        />
      </List>
      {repeatOpen ? (
        <RepeatSheet
          open
          onClose={() => setRepeatOpen(false)}
          rule={d.rule}
          dueDay={/^\d{4}-\d{2}-(\d{2})$/.test(d.date) ? Number(d.date.slice(8)) : null}
          onChange={(rule) => set({ rule })}
        />
      ) : null}
    </>
  )
}
