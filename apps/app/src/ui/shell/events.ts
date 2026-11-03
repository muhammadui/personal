/** App-wide UI requests between parts of the shell that are not parent and child. */
export type UiEvent =
  | { type: "quick-add" }
  | { type: "session-expired" }
  | { type: "verify-email" }
  | { type: "notify-prompt"; title: string; fireAt: string }

const NAME = "personal:ui"

export function emitUi(event: UiEvent): void {
  window.dispatchEvent(new CustomEvent<UiEvent>(NAME, { detail: event }))
}

export function onUi(fn: (event: UiEvent) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<UiEvent>).detail)
  window.addEventListener(NAME, handler)
  return () => window.removeEventListener(NAME, handler)
}
