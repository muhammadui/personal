import { IconButton } from "@personal/ui"
import { useEditorState, type Editor } from "@tiptap/react"
import { Bold, Code, Heading1, Heading2, Italic, List, ListChecks, ListOrdered } from "lucide-react"
import type { ReactNode } from "react"

type Tool = { label: string; icon: ReactNode; active: boolean; run: () => void; group: number }
const ICON = { size: 20, strokeWidth: 2, "aria-hidden": true } as const

/** Formatting toolbar: a row under the header on desktop (Editor.dc.html), a bottom bar on phones (PhoneEditor). */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      tasks: e.isActive("taskList"),
      code: e.isActive("codeBlock"),
    }),
  })
  const chain = () => editor.chain().focus()
  const tools: Tool[] = [
    { group: 0, label: "Heading", icon: <Heading1 {...ICON} />, active: state.h1, run: () => chain().toggleHeading({ level: 1 }).run() },
    { group: 0, label: "Subheading", icon: <Heading2 {...ICON} />, active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { group: 0, label: "Bold", icon: <Bold {...ICON} />, active: state.bold, run: () => chain().toggleBold().run() },
    { group: 0, label: "Italic", icon: <Italic {...ICON} />, active: state.italic, run: () => chain().toggleItalic().run() },
    { group: 1, label: "Checklist", icon: <ListChecks {...ICON} />, active: state.tasks, run: () => chain().toggleList("taskList", "taskItem").run() },
    { group: 1, label: "Bulleted list", icon: <List {...ICON} />, active: state.bullet, run: () => chain().toggleBulletList().run() },
    { group: 1, label: "Numbered list", icon: <ListOrdered {...ICON} />, active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { group: 1, label: "Code block", icon: <Code {...ICON} />, active: state.code, run: () => chain().toggleCodeBlock().run() },
  ]
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-between overflow-x-auto border-t border-line bg-surface px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] md:static md:justify-start md:gap-0.5 md:border-t-0 md:border-b md:bg-transparent md:px-0 md:pt-0 md:pb-2"
    >
      {tools.map((t, i) => (
        <span key={t.label} className="contents">
          {i > 0 && tools[i - 1]!.group !== t.group ? <span className="mx-1.5 hidden h-5 w-px self-center bg-line md:block" aria-hidden /> : null}
          <IconButton
            plain
            large
            label={t.label}
            aria-pressed={t.active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
            style={t.active ? { background: "var(--tint-blue)", color: "var(--text-accent)" } : undefined}
          >
            {t.icon}
          </IconButton>
        </span>
      ))}
    </div>
  )
}
