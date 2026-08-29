import { describe, expect, it } from "vitest"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadConfig } from "../src/config.js"

const envKeys = ["ASK_MCP_PORT", "ASK_MCP_TIMEOUT_MS", "ASK_MCP_AUTH_TOKEN", "ASK_MCP_ADMIN_TOKEN", "ASK_MCP_DATA_DIR", "ASK_MCP_NO_OPEN"] as const

function cleanEnv(): void {
  for (const key of envKeys) delete process.env[key]
}

describe("loadConfig precedence", () => {
  it("applies defaults", () => {
    cleanEnv()
    const config = loadConfig([])
    expect(config.port).toBe(8787)
    expect(config.host).toBe("127.0.0.1")
    expect(config.baseUrl).toBe("http://127.0.0.1:8787")
    expect(config.surface).toBe("auto")
    expect(config.openBrowser).toBe(true)
    expect(config.configPath).toBe(path.join(path.dirname(config.dataDir), "ask-mcp", "config.json"))
  })

  it("reads values from a config file", () => {
    cleanEnv()
    const dir = mkdtempSync(path.join(tmpdir(), "ask-config-"))
    const file = path.join(dir, "config.json")
    writeFileSync(file, JSON.stringify({ port: 9000, timeoutMs: 5000, surface: "browser" }))
    const config = loadConfig(["--config", file, "--data-dir", dir, "--no-open"])
    expect(config.port).toBe(9000)
    expect(config.timeoutMs).toBe(5000)
    expect(config.surface).toBe("browser")
    expect(config.openBrowser).toBe(false)
    expect(config.configPath).toBe(file)
  })

  it("CLI overrides env overrides file", () => {
    cleanEnv()
    const dir = mkdtempSync(path.join(tmpdir(), "ask-config-"))
    const file = path.join(dir, "config.json")
    writeFileSync(file, JSON.stringify({ port: 9001, timeoutMs: 5000 }))
    process.env.ASK_MCP_PORT = "9002"
    process.env.ASK_MCP_TIMEOUT_MS = "6000"
    const config = loadConfig(["--config", file, "--data-dir", dir, "--port", "9003"])
    expect(config.port).toBe(9003) // CLI wins over env
    expect(config.timeoutMs).toBe(6000) // env wins over file
  })

  it("falls back adminToken to authToken", () => {
    cleanEnv()
    const config = loadConfig(["--auth-token", "secret", "--no-open"])
    expect(config.adminToken).toBe("secret")
    const explicit = loadConfig(["--auth-token", "secret", "--admin-token", "admin", "--no-open"])
    expect(explicit.adminToken).toBe("admin")
  })

  it("rejects invalid files and unknown flags", () => {
    cleanEnv()
    const dir = mkdtempSync(path.join(tmpdir(), "ask-config-"))
    const bad = path.join(dir, "bad.json")
    writeFileSync(bad, JSON.stringify({ port: "not-a-number" }))
    expect(() => loadConfig(["--config", bad])).toThrow()
    expect(() => loadConfig(["--bogus"])).toThrow()
    writeFileSync(bad, "{ nope")
    expect(() => loadConfig(["--config", bad])).toThrow(/not valid JSON/)
  })
})
