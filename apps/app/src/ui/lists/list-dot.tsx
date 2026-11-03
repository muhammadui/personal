import { listColourVar } from "./list-colours"

/** `.ldot`: the small square colour marker for a list. */
export function ListDot({ colour, inbox = false, size = 8, inset = false }: { colour: string | null | undefined; inbox?: boolean; size?: 8 | 12; inset?: boolean }) {
  return <span className="ldot" style={{ background: listColourVar(colour, inbox), width: size, height: size, flexBasis: size, margin: inset ? "0 5px" : undefined }} aria-hidden />
}
