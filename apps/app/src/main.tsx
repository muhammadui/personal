import "@fontsource-variable/plus-jakarta-sans"
import "@fontsource/jetbrains-mono/400.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./app"
import { applyTheme, storedTheme } from "./ui/settings/theme"
import "./styles.css"

applyTheme(storedTheme())
document.body.classList.add("p-app")

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerSW({ immediate: true })
