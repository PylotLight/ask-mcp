import { describe, expect, it } from "vitest"
import { mkdtempSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { installCommands } from "../src/commands/install.js"

describe("install-commands", () => {
  it("writes an ask-admin opener with no room for improvisation", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    await installCommands(["--dir", dir, "--base-url", "http://127.0.0.1:9999"])
    const content = await readFile(path.join(dir, "ask-admin.md"), "utf8")
    expect(content).toContain("http://127.0.0.1:9999/admin")
    expect(content).toContain("open \"http://127.0.0.1:9999/admin\"")
    expect(content).toMatch(/do not probe/i)
    expect(content).not.toMatch(/curl|healthz|browser_open/i)
    expect(content).toContain("--admin-token")
  })
})
