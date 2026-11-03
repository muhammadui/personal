import { MIN_PIN_LENGTH } from "../../sync/note-lock"

/** Locked notes use a 4-digit PIN (PhoneLocked.dc.html), the shortest the lock code accepts. */
export const PIN_LENGTH = Math.max(4, MIN_PIN_LENGTH)
