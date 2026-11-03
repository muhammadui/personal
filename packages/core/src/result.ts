/** Typed result objects (CLAUDE.md: errors are values, never swallowed). */
export type Ok<T> = { ok: true; value: T }
export type Err<E extends string = string> = { ok: false; error: E; message: string }
export type Result<T, E extends string = string> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E extends string>(error: E, message: string): Err<E> => ({ ok: false, error, message })
