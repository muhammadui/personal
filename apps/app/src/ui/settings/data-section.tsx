import { List, RowButton, SectionLabel } from "@personal/ui"
import { Download } from "lucide-react"
import { useState } from "react"
import { downloadExport } from "../../data/export"
import { useStore } from "../../data/session"
import { useToast } from "../shell/toast-provider"
import { DeleteAccount } from "./delete-account"

/** "Your data" (Settings.dc.html): export everything on this device, delete the account. */
export function DataSection() {
  const store = useStore()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  const exportAll = async () => {
    if (busy) return
    setBusy(true)
    try {
      await downloadExport(store)
    } catch (e) {
      console.error("Export failed", e)
      showToast({ message: "Couldn't export your data. Try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Your data</SectionLabel>
      <List>
        <RowButton
          icon={<Download size={20} strokeWidth={2} aria-hidden />}
          label={busy ? "Preparing…" : "Export my data"}
          detail="Downloads everything on this device as a JSON file."
          chevron={false}
          onClick={() => void exportAll()}
        />
      </List>
      <DeleteAccount />
    </section>
  )
}
