/**
 * Hybrid logical clock (see docs/sync.md).
 *
 * Serialised form: `<wallMs 15 digits>-<counter 5 digits>-<deviceId>`.
 * Plain string comparison of two serialised HLCs gives their causal order;
 * the device id breaks ties so two devices never produce equal stamps.
 */

export type HlcState = { wall: number; counter: number; deviceId: string }

const WALL_DIGITS = 15
const COUNTER_DIGITS = 5
const MAX_COUNTER = 10 ** COUNTER_DIGITS - 1
const MAX_WALL = 10 ** WALL_DIGITS - 1
/** Remote stamps further than this into the future are rejected as corrupt. */
export const MAX_DRIFT_MS = 24 * 60 * 60 * 1000

export class HlcError extends Error {
  override name = "HlcError"
}

export function createHlc(deviceId: string, now: number = Date.now()): HlcState {
  assertDeviceId(deviceId)
  return { wall: Math.floor(now), counter: 0, deviceId }
}

/** Advance the clock for a local event. Returns the new state (the stamp is `serializeHlc(state)`). */
export function tickHlc(state: HlcState, now: number = Date.now()): HlcState {
  const wallNow = Math.floor(now)
  if (wallNow > state.wall) return { wall: wallNow, counter: 0, deviceId: state.deviceId }
  return bump(state.wall, state.counter, state.deviceId)
}

/** Merge a remote stamp into the local clock so later local stamps sort after it. */
export function receiveHlc(state: HlcState, remote: string, now: number = Date.now()): HlcState {
  const r = parseHlc(remote)
  const wallNow = Math.floor(now)
  if (r.wall > wallNow + MAX_DRIFT_MS) {
    throw new HlcError(`Remote clock is more than 24 h ahead: ${remote}`)
  }
  const wall = Math.max(state.wall, r.wall, wallNow)
  if (wall === state.wall && wall === r.wall) {
    return bump(wall, Math.max(state.counter, r.counter), state.deviceId)
  }
  if (wall === state.wall) return bump(wall, state.counter, state.deviceId)
  if (wall === r.wall) return bump(wall, r.counter, state.deviceId)
  return { wall, counter: 0, deviceId: state.deviceId }
}

function bump(wall: number, counter: number, deviceId: string): HlcState {
  if (counter >= MAX_COUNTER) return { wall: wall + 1, counter: 0, deviceId }
  return { wall, counter: counter + 1, deviceId }
}

export function serializeHlc(state: HlcState): string {
  if (state.wall > MAX_WALL || state.wall < 0) throw new HlcError(`Wall time out of range: ${state.wall}`)
  return `${String(state.wall).padStart(WALL_DIGITS, "0")}-${String(state.counter).padStart(COUNTER_DIGITS, "0")}-${state.deviceId}`
}

const HLC_RE = /^(\d{15})-(\d{5})-([A-Za-z0-9_]{1,64})$/

export function parseHlc(value: string): HlcState {
  const m = HLC_RE.exec(value)
  if (!m) throw new HlcError(`Not an HLC: ${value}`)
  return { wall: Number(m[1]), counter: Number(m[2]), deviceId: m[3] as string }
}

export function isHlc(value: unknown): value is string {
  return typeof value === "string" && HLC_RE.test(value)
}

export function compareHlc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function assertDeviceId(deviceId: string) {
  if (!/^[A-Za-z0-9_]{1,64}$/.test(deviceId)) throw new HlcError(`Invalid device id: ${deviceId}`)
}

/** Device ids are UUIDs without dashes, so they fit the HLC alphabet. */
export function toDeviceId(uuid: string): string {
  return uuid.replace(/-/g, "")
}
