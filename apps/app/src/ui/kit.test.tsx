import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DevUiPage } from "../routes/dev-ui-page"

describe("UI kit page", () => {
  afterEach(cleanup)

  it("renders every shared component without errors", () => {
    render(<DevUiPage />)
    expect(screen.getByRole("heading", { name: "UI kit" })).toBeTruthy()
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(2)
    expect(screen.getByRole("switch", { name: "Reminders" }).getAttribute("aria-checked")).toBe("true")
  })

  it("toggles a task checkbox and a switch", () => {
    render(<DevUiPage />)
    const box = screen.getAllByRole("checkbox", { name: "Mark done" })[0]!
    fireEvent.click(box)
    expect(box.getAttribute("aria-checked")).toBe("true")
    const sw = screen.getByRole("switch", { name: "Reminders" })
    fireEvent.click(sw)
    expect(sw.getAttribute("aria-checked")).toBe("false")
  })

  it("keeps only digits in the code input", () => {
    render(<DevUiPage />)
    const input = screen.getByLabelText("6-digit code", { selector: "input" })
    fireEvent.change(input, { target: { value: "12a34567" } })
    expect((input as HTMLInputElement).value).toBe("123456")
  })
})
