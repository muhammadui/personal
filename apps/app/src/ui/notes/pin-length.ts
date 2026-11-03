import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "../../sync/note-lock"

/** PIN lengths offered when locking a note. Unlocking accepts any length in this range. */
export const PIN_LENGTHS = [4, 6, 8] as const
export type PinLength = (typeof PIN_LENGTHS)[number]
export const DEFAULT_PIN_LENGTH: PinLength = 6
export { MAX_PIN_LENGTH, MIN_PIN_LENGTH }
