import { useEffect } from "react"
import { useSettings } from "../hooks/use-settings"
import { applyTheme } from "../settings/theme"

/** Keep <html data-theme> in step with the synced theme setting. */
export function useApplyTheme(): void {
  const { settings } = useSettings()
  const theme = settings?.theme
  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])
}
