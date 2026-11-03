import { RouterProvider } from "@tanstack/react-router"
import { SessionProvider } from "./data/session"
import { router } from "./router"

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
