import { Button, Field, Sheet, TextInput } from "@personal/ui"
import { useState, type FormEvent } from "react"
import { addList } from "../../data/actions"
import { useStore } from "../../data/session"
import { LIST_COLOURS } from "./list-colours"

/** "New list" sheet from PhoneLists: name and colour. */
export function NewListSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const store = useStore()
  const [name, setName] = useState("")
  const [colour, setColour] = useState(LIST_COLOURS[0]!.value)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = await addList(store, name)
    await store.update("lists", id, { colour })
    setName("")
    onClose()
    onCreated?.(id)
  }

  return (
    <Sheet open={open} onClose={onClose} label="New list">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <h2 className="t-title3">New list</h2>
        <Field label="Name" htmlFor="list-name">
          <TextInput id="list-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" />
        </Field>
        <div className="field">
          <span className="field-label">Colour</span>
          <div role="group" aria-label="Colour" className="flex gap-2.5">
            {LIST_COLOURS.map((c) => (
              <button key={c.value} type="button" aria-label={c.label} aria-pressed={colour === c.value} className={`swatch ${colour === c.value ? "is-on" : ""}`} style={{ background: `var(--${c.value})` }} onClick={() => setColour(c.value)} />
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button size="xl" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="xl" className="flex-[2]" disabled={!name.trim()}>
            Create list
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
