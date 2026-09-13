import { describe, expect, it } from "vitest"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { loadConfig } from "../src/config.js"

const envKeys = ["ASK_MCP_PORT", "ASK_MCP_TIMEOUT_MS", "ASK_MCP_BROWSER", "ASK_MCP_THEME", "ASK_MCP_THEME_STARS", "ASK_MCP_THEME_MOTION", "ASK_MCP_AUTH_TOKEN", "ASK_MCP_ADMIN_TOKEN", "ASK_MCP_DATA_DIR", "ASK_MCP_NO_OPEN"] as const

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
    expect(config.theme).toBe("minimal")
    expect(config.themeStars).toBe(1000)
    expect(config.themeMotion).toBe("full")
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

  it("resolves the browser setting with CLI > env > file precedence", () => {
    cleanEnv()
    const dir = mkdtempSync(path.join(tmpdir(), "ask-config-"))
    const file = path.join(dir, "config.json")
    writeFileSync(file, JSON.stringify({ browser: "Firefox" }))
    process.env.ASK_MCP_BROWSER = "Google Chrome"
    const fromEnv = loadConfig(["--config", file, "--data-dir", dir, "--no-open"])
    expect(fromEnv.browser).toBe("Google Chrome")
    const fromCli = loadConfig(["--config", file, "--data-dir", dir, "--no-open", "--browser", "Arc"])
    expect(fromCli.browser).toBe("Arc")
    delete process.env.ASK_MCP_BROWSER
    const fromFile = loadConfig(["--config", file, "--data-dir", dir, "--no-open"])
    expect(fromFile.browser).toBe("Firefox")
    const fallback = loadConfig(["--no-open"])
    expect(fallback.browser).toBeUndefined()
  })

  it("resolves the theme setting with CLI > env > file precedence", () => {
    cleanEnv()
    const dir = mkdtempSync(path.join(tmpdir(), "ask-config-"))
    const file = path.join(dir, "config.json")
    writeFileSync(file, JSON.stringify({ theme: "dots" }))
    process.env.ASK_MCP_THEME = "starfield"
    const fromEnv = loadConfig(["--config", file, "--data-dir", dir, "--no-open"])
    expect(fromEnv.theme).toBe("starfield")
    const fromCli = loadConfig(["--config", file, "--data-dir", dir, "--no-open", "--theme", "contour"])
    expect(fromCli.theme).toBe("contour")
    delete process.env.ASK_MCP_THEME
    const fromFile = loadConfig(["--config", file, "--data-dir", dir, "--no-open"])
    expect(fromFile.theme).toBe("dots")
    expect(() => loadConfig(["--theme", "aurora"])).toThrow(/invalid theme/)
  })

  it("resolves star count and motion with validation", () => {
    cleanEnv()
    const config = loadConfig(["--theme-stars", "2500", "--theme-motion", "subtle", "--no-open"])
    expect(config.themeStars).toBe(2500)
    expect(config.themeMotion).toBe("subtle")
    process.env.ASK_MCP_THEME_STARS = "42"
    const fromEnv = loadConfig(["--no-open"])
    expect(fromEnv.themeStars).toBe(42)
    delete process.env.ASK_MCP_THEME_STARS
    expect(() => loadConfig(["--theme-stars", "-1"])).toThrow(/integer 0/)
    expect(() => loadConfig(["--theme-stars", "5001"])).toThrow(/integer 0/)
    expect(() => loadConfig(["--theme-motion", "wild"])).toThrow(/invalid theme-motion/)
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
