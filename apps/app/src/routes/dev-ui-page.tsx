import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Chip,
  CodeInput,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Kbd,
  List,
  NavItem,
  NoteCard,
  PasswordInput,
  Progress,
  RowButton,
  SectionLabel,
  SegmentedControl,
  Sheet,
  SkeletonList,
  Switch,
  SyncStatus,
  TabBar,
  Tag,
  TaskRow,
  TextInput,
  Toast,
} from "@personal/ui"
import { Bell, CalendarDays, CircleCheck, CloudOff, FileText, Info, MoreHorizontal, Search, Sun, WifiOff } from "lucide-react"
import { useState, type ReactNode } from "react"
import { PageHeader } from "../ui/page-header"

const ICON = { size: 18, strokeWidth: 2, "aria-hidden": true } as const

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{title}</SectionLabel>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  )
}

/** /dev/ui: every shared component, for checking against Components.dc.html. */
export function DevUiPage() {
  const [checks, setChecks] = useState([false, true])
  const [seg, setSeg] = useState<"system" | "light" | "dark">("system")
  const [sw, setSw] = useState(true)
  const [chip, setChip] = useState("15")
  const [code, setCode] = useState("481")
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [toast, setToast] = useState(false)
  const toggle = (i: number) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))

  return (
    <>
      <PageHeader eyebrow="Developer" title="UI kit" />
      <Block title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" size="sm">
          Small
        </Button>
        <Button variant="primary" size="lg">
          Large
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <span className="flex gap-2 p-3" style={{ background: "var(--brand-navy)", borderRadius: "var(--radius-lg)" }}>
          <Button variant="inverse">Inverse</Button>
          <Button variant="outline-inverse">Outline inverse</Button>
        </span>
      </Block>
      <Block title="Icon buttons">
        <IconButton label="Notifications" pip>
          <Bell size={20} strokeWidth={2} aria-hidden />
        </IconButton>
        <IconButton label="More" plain>
          <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
        </IconButton>
        <IconButton label="Search" large>
          <Search size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      </Block>
      <Block title="Fields">
        <div className="flex w-full max-w-[400px] flex-col gap-4">
          <Field label="Email" htmlFor="dev-email" hint="We never share it.">
            <TextInput id="dev-email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" htmlFor="dev-pw" error="That password doesn't match this email.">
            <PasswordInput id="dev-pw" invalid defaultValue="password1" />
          </Field>
          <Field label="Verification code" htmlFor="dev-code">
            <CodeInput id="dev-code" value={code} onChange={setCode} />
          </Field>
        </div>
      </Block>
      <Block title="Tasks">
        <div className="w-full max-w-[560px]">
          <List>
            <TaskRow title="Send the draft report" done={checks[0]!} onToggle={() => toggle(0)} onOpen={() => undefined} meta={<span className="meta-item meta-accent">2:00 pm · reminder</span>} trailing={<Badge tone="warn">HIGH</Badge>} />
            <TaskRow title="Morning walk" done={checks[1]!} onToggle={() => toggle(1)} meta={<span className="meta-item">6:30 am · Daily</span>} />
            <TaskRow
              title="Buy printer ink"
              done={false}
              warn
              onToggle={() => undefined}
              meta={
                <span className="meta-item meta-warn">
                  <CloudOff aria-hidden strokeWidth={2} />
                  Not synced
                </span>
              }
            />
          </List>
        </div>
        <Checkbox checked={false} label="Unchecked" onToggle={() => undefined} />
        <Checkbox checked label="Checked" onToggle={() => undefined} />
      </Block>
      <Block title="Cards">
        <Card panel className="w-[260px]">
          <span className="t-title3">Panel</span>
        </Card>
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          <NoteCard title="Plain" preview="Sync engine first, then auth." meta="Edited 1 h ago" />
          <NoteCard colour="lilac" title="Lilac" preview="Two-device test rig." meta="Edited yesterday" />
          <NoteCard colour="sand" title="Sand" preview="Blend the pepper." meta="Fri" />
          <NoteCard colour="mint" title="Mint" preview="Weekly review." meta="Mon" />
          <NoteCard colour="blue" title="Blue" eyebrow="Work" preview="Decide on the host." meta="1 hour ago" />
          <NoteCard colour="navy" title="Navy" eyebrow="Personal" meta="Locked" />
        </div>
      </Block>
      <Block title="Navigation">
        <div className="sidebar w-[248px]" style={{ padding: 12 }}>
          <div className="nav-group">
            <NavItem icon={<Sun {...ICON} />} label="Today" count={6} active />
            <NavItem icon={<CalendarDays {...ICON} />} label="Upcoming" count={12} />
            <NavItem icon={<FileText {...ICON} />} label="All notes" count={48} />
          </div>
        </div>
        <div className="w-[390px] max-w-full">
          <TabBar
            left={[
              { key: "t", label: "Today", icon: <Sun size={24} strokeWidth={2} aria-hidden />, render: ({ className, children }) => <a className={`${className} is-active`}>{children}</a> },
              { key: "n", label: "Notes", icon: <FileText size={24} strokeWidth={2} aria-hidden />, render: ({ className, children }) => <a className={className}>{children}</a> },
            ]}
            right={[
              { key: "u", label: "Upcoming", icon: <CalendarDays size={24} strokeWidth={2} aria-hidden />, render: ({ className, children }) => <a className={className}>{children}</a> },
              { key: "s", label: "Search", icon: <Search size={24} strokeWidth={2} aria-hidden />, render: ({ className, children }) => <a className={className}>{children}</a> },
            ]}
            onFab={() => setSheet(true)}
          />
        </div>
      </Block>
      <Block title="Chips, tags, badges, kbd">
        {[
          ["at", "At 4:00 pm"],
          ["15", "15 min before"],
          ["60", "1 hour before"],
        ].map(([id, label]) => (
          <Chip key={id} on={chip === id} onClick={() => setChip(id!)}>
            {label}
          </Chip>
        ))}
        <Tag>#sync</Tag>
        <Tag outline>Task · Thu</Tag>
        <Badge tone="warn">HIGH</Badge>
        <Badge tone="accent">THIS DEVICE</Badge>
        <Badge tone="success">PERSISTENT</Badge>
        <Kbd>⌘K</Kbd>
      </Block>
      <Block title="Controls">
        <SegmentedControl
          label="Theme"
          value={seg}
          onChange={setSeg}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          className="w-[300px]"
        />
        <Switch label="Reminders" checked={sw} onChange={setSw} />
        <div className="w-[240px]">
          <Progress value={0.33} label="Progress" />
        </div>
        <Avatar name="Muhammad Ibrahim" />
      </Block>
      <Block title="Sync status">
        <SyncStatus state="ok" label="Synced just now" />
        <SyncStatus state="busy" label="Syncing…" />
        <SyncStatus state="off" label="Offline · 3 waiting" />
        <SyncStatus pill state="ok" label="Synced" />
        <SyncStatus pill state="off" label="Offline · 3 changes saved" />
      </Block>
      <Block title="Banners">
        <div className="flex w-full max-w-[560px] flex-col gap-3">
          <Banner tone="warn" icon={<WifiOff aria-hidden />} title="You're offline">
            3 changes are saved on this device and will sync when you reconnect.
          </Banner>
          <Banner tone="info" icon={<Info aria-hidden />}>
            Your notes download to this device after sign-in, so they keep working offline.
          </Banner>
          <Banner tone="success" icon={<CircleCheck aria-hidden />}>
            You're signed in. This device is ready to work offline.
          </Banner>
          <Banner tone="danger" icon={<Info aria-hidden />} title="Wrong PIN">
            2 tries left before this note locks for 5 minutes.
          </Banner>
        </div>
      </Block>
      <Block title="Toast, sheet, dialog">
        <Button onClick={() => setToast((t) => !t)}>Toggle toast</Button>
        <Button onClick={() => setSheet(true)}>Open sheet</Button>
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        {toast ? <Toast icon={<CircleCheck size={18} strokeWidth={2} aria-hidden />} message="Task completed" actionLabel="Undo" onAction={() => setToast(false)} /> : null}
      </Block>
      <Block title="Empty and loading">
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          <EmptyState tone="success" icon={<CircleCheck size={24} strokeWidth={2} aria-hidden />} title="You're all set">
            Everything for today is done.
          </EmptyState>
          <SkeletonList />
        </div>
      </Block>
      <Block title="Rows">
        <div className="w-full max-w-[420px]">
          <List>
            <RowButton icon={<CalendarDays size={20} strokeWidth={2} aria-hidden />} label="Due" value="Today, 10:00 am" />
            <RowButton icon={<Bell size={20} strokeWidth={2} aria-hidden />} label="Reminder" value="15 min before" />
          </List>
        </div>
      </Block>
      <Sheet open={sheet} onClose={() => setSheet(false)} label="Example sheet">
        <h2 className="t-title3">Bottom sheet</h2>
        <p className="t-body">Slides up over the scrim. Tap the scrim or press Esc to close.</p>
        <Button variant="primary" size="xl" block onClick={() => setSheet(false)}>
          Close
        </Button>
      </Sheet>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Delete this note?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setDialog(false)}>
              Delete note
            </Button>
          </>
        }
      >
        It moves to Trash. You can restore it for 30 days.
      </Dialog>
    </>
  )
}
