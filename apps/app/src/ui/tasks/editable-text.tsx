import { cx } from "@personal/ui"
import { useEffect, useRef, useState } from "react"

type Props = {
  value: string
  onCommit: (value: string) => void
  label: string
  placeholder?: string
  multiline?: boolean
  className?: string
  id?: string
  autoFocus?: boolean
}

/** Text that saves when you leave the field (or press Enter on a single line). */
export function EditableText({ value, onCommit, label, placeholder, multiline = false, className, id, autoFocus = false }: Props) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)

  // Take changes from sync unless the user is typing.
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])

  const commit = () => {
    focused.current = false
    if (draft !== value) onCommit(draft)
  }

  const shared = {
    id,
    autoFocus,
    "aria-label": label,
    placeholder,
    value: draft,
    onFocus: () => {
      focused.current = true
    },
    onBlur: commit,
  }

  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        className={cx("notes-area", className)}
      />
    )
  }
  return (
    <input
      {...shared}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setDraft(value)
          focused.current = false
        }
      }}
      className={className}
    />
  )
}
