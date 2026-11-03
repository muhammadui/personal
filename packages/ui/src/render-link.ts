import type { ReactNode } from "react"

/** Lets the app render a router link with the component's class and content. */
export type RenderLink = (props: { className: string; children: ReactNode }) => ReactNode
