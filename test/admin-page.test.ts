import { describe, expect, it } from "vitest"
import { renderAdminPage } from "../src/render/admin.js"

describe("admin config browser field", () => {
  it("renders a dropdown with OS groups, Orion, and a custom escape hatch", () => {
    const html = renderAdminPage()
    expect(html).toContain('id="cfg-browser"')
    expect(html).toContain("<select")
    expect(html).toContain("<option value=\"\">System default</option>")
    expect(html).toContain("<option value=\"Orion\">Orion</option>")
    expect(html).toContain('id="cfg-browser-custom-wrap"')
    expect(html).not.toContain("browser-presets")
  })
})
