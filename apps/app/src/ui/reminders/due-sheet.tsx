import { Banner, Button, Chip, Sheet, TextInput } from "@personal/ui"
import { Info } from "lucide-react"
import { useEffect, useState } from "react"
import { useSettings } from "../hooks/use-settings"
import { clockLabel, dateLabel } from "../format"
import { addDaysYmd, fromUtcIso, todayYmd, toUtcIso, weekdayOf, type Ymd } from "./local-date"
import { MonthCalendar } from "./month-calendar"

export type ReminderChoice = "none" | "at" | "15" | "60"
export type DueValue = { dueAt: string | null; hasTime: boolean; reminder: ReminderChoice }

type Time = { hour: number; minute: number }
const TIMES: Time[] = [
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 18, minute: 0 },
]

type Props = {
  open: boolean
  onClose: () => void
  timeZone: string
  /** "task": due date, optional time, reminder chips. "reminder": one date and time to be reminded at. */
  mode: "task" | "reminder"
  title?: string
  initial: DueValue
  onSave: (value: DueValue) => void
}

const pad = (n: number) => String(n).padStart(2, "0")

/** PhoneDatePicker: presets, month grid, time chips, reminder chips, plain summary, Save. */
function parseTime(hhmm: string | undefined): Time {
  const m = hhmm ? /^(\d{2}):(\d{2})$/.exec(hhmm) : null
  const hour = m ? Number(m[1]) : 9
  const minute = m ? Number(m[2]) : 0
  return hour < 24 && minute < 60 ? { hour, minute } : { hour: 9, minute: 0 }
}

export function DueSheet({ open, onClose, timeZone, mode, title, initial, onSave }: Props) {
  const { settings } = useSettings()
  /** Settings → Default reminder time: used whenever a picked date needs a time. */
  const dflt = parseTime(settings?.default_reminder_time)
  const now = new Date()
  const today = todayYmd(now, timeZone)
  const start = initial.dueAt ? fromUtcIso(initial.dueAt, timeZone) : null
  const [date, setDate] = useState<Ymd | null>(start?.date ?? (mode === "reminder" ? today : null))
  const [time, setTimeRaw] = useState<Time | null>(start && (initial.hasTime || mode === "reminder") ? start.time : mode === "reminder" ? dflt : null)
  const [custom, setCustom] = useState(false)
  const [reminder, setReminder] = useState<ReminderChoice>(initial.reminder)
  const [preset, setPreset] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const setTime = (t: Time | null) => {
    setTouched(true)
    setTimeRaw(t)
  }

  // The settings record can arrive after the sheet mounted; follow it until the time is picked.
  const dfltKey = `${dflt.hour}:${dflt.minute}`
  useEffect(() => {
    if (touched || start || mode !== "reminder") return
    const [h, m] = dfltKey.split(":").map(Number)
    setTimeRaw({ hour: h!, minute: m! })
    // `start` is derived from props on every render; only the default time matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dfltKey, open, touched, mode])

  const nowZ = fromUtcIso(now.toISOString(), timeZone).time
  const presets: { id: string; label: string; date: Ymd; time: Time }[] = []
  if (nowZ.hour < 18) presets.push({ id: "later", label: "Later today", date: today, time: { hour: 18, minute: 0 } })
  presets.push({ id: "tomorrow", label: "Tomorrow", date: addDaysYmd(today, 1), time: dflt })
  const toSat = (6 - weekdayOf(today) + 7) % 7 || 7
  presets.push({ id: "weekend", label: "This weekend", date: addDaysYmd(today, toSat), time: dflt })
  const toMon = (8 - weekdayOf(today)) % 7 || 7
  presets.push({ id: "next", label: "Next week", date: addDaysYmd(today, toMon), time: dflt })

  const dueAt = date ? toUtcIso(date, time, timeZone) : null
  const effectiveReminder: ReminderChoice = mode === "task" && (!dueAt || !time) ? "none" : reminder
  const isPresetTime = (t: Time) => !custom && time !== null && time.hour === t.hour && time.minute === t.minute

  const whenText = dueAt ? `${dateLabel(dueAt, now, timeZone)}${time ? `, ${clockLabel(time.hour, time.minute)}` : ""}` : ""
  const summary =
    mode === "reminder"
      ? dueAt
        ? `Reminds you ${whenText}, on every device.`
        : "Pick a day and a time."
      : !dueAt
        ? "No due date."
        : `Due ${whenText}.${
            effectiveReminder === "none" ? "" : effectiveReminder === "at" ? " Reminder at that time, on every device." : ` Reminder ${effectiveReminder === "15" ? "15 min" : "1 hour"} before, on every device.`
          }`

  const save = () => {
    onSave({ dueAt, hasTime: mode === "reminder" ? true : time !== null, reminder: mode === "reminder" ? "at" : effectiveReminder })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} label={title ?? (mode === "task" ? "Due and reminder" : "Remind me")}>
      <div className="flex items-center justify-between">
        <h2 className="t-title3">{title ?? (mode === "task" ? "Due and reminder" : "Remind me")}</h2>
        <Button
          variant="ghost"
          size="sm"
          style={{ color: "var(--text-accent)" }}
          onClick={() => {
            onSave({ dueAt: null, hasTime: false, reminder: "none" })
            onClose()
          }}
        >
          Clear
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Chip
            key={p.id}
            on={preset === p.id}
            onClick={() => {
              setPreset(p.id)
              setDate(p.date)
              setTime(p.time)
              setCustom(false)
            }}
          >
            {p.label}
          </Chip>
        ))}
      </div>
      <MonthCalendar
        value={date}
        today={today}
        onPick={(d) => {
          setPreset(null)
          setDate(d)
        }}
      />
      <div className="flex flex-col gap-2">
        <span className="t-label">Time</span>
        <div className="flex flex-wrap gap-2">
          {mode === "task" ? (
            <Chip
              on={time === null}
              onClick={() => {
                setTime(null)
                setCustom(false)
                setPreset(null)
              }}
            >
              No time
            </Chip>
          ) : null}
          {TIMES.map((t) => (
            <Chip
              key={t.hour}
              on={isPresetTime(t)}
              onClick={() => {
                setTime(t)
                setCustom(false)
                setPreset(null)
                if (!date) setDate(today)
              }}
            >
              {clockLabel(t.hour, t.minute)}
            </Chip>
          ))}
          <Chip
            on={custom}
            onClick={() => {
              setCustom(true)
              setPreset(null)
              if (!time) setTime(dflt)
              if (!date) setDate(today)
            }}
          >
            Custom
          </Chip>
        </div>
        {custom ? (
          <TextInput
            type="time"
            aria-label="Time"
            value={time ? `${pad(time.hour)}:${pad(time.minute)}` : ""}
            onChange={(e) => {
              const m = /^(\d{2}):(\d{2})/.exec(e.target.value)
              if (m) setTime({ hour: Number(m[1]), minute: Number(m[2]) })
            }}
          />
        ) : null}
      </div>
      {mode === "task" && time && dueAt ? (
        <div className="flex flex-col gap-2">
          <span className="t-label">Remind me</span>
          <div className="flex flex-wrap gap-2">
            <Chip on={reminder === "none"} onClick={() => setReminder("none")}>
              None
            </Chip>
            <Chip on={reminder === "at"} onClick={() => setReminder("at")}>
              At {clockLabel(time.hour, time.minute)}
            </Chip>
            <Chip on={reminder === "15"} onClick={() => setReminder("15")}>
              15 min before
            </Chip>
            <Chip on={reminder === "60"} onClick={() => setReminder("60")}>
              1 hour before
            </Chip>
          </div>
        </div>
      ) : null}
      <Banner tone="info" icon={<Info aria-hidden />}>
        {summary}
      </Banner>
      <Button variant="primary" size="xl" block onClick={save} disabled={mode === "reminder" && !dueAt}>
        Save
      </Button>
    </Sheet>
  )
}
