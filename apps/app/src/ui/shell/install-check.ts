export const INSTALL_DISMISSED_KEY = "personal.install-dismissed"

/**
 * Add to Home Screen guide (InstallPWA.dc.html): iPhone Safari only, and only when the app
 * is not already running from the Home Screen.
 */
export function shouldOfferInstall(userAgent: string, standalone: boolean | undefined): boolean {
  if (standalone === true) return false
  if (!/iPhone|iPod/.test(userAgent)) return false
  // Other iPhone browsers name themselves; Safari does not.
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent)) return false
  return /Safari\//.test(userAgent)
}
