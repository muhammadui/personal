import { useSettings } from "./use-settings"

export function useTimeZone(): string {
  return useSettings().timeZone
}
