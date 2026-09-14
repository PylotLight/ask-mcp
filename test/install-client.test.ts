import { describe, expect, it } from "vitest"
import { mkdtempSync } from "node:fs"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { clientCommand, installClients, stripJsonComments } from "../src/commands/install-client.js"

async function fakeBin(dir: string, name: string): Promise<string> {
  const bin = path.join(dir, "bin")
  await mkdir(bin, { recursive: true })
  const target = path.join(bin, name)
  await writeFile(target, "#!/bin/sh\nexit 0\n")
  await chmod(target, 0o755)
  return bin
}

function readJson(p: string): Promise<Record<string, unknown>> {
  return readFile(p, "utf8").then((t) => JSON.parse(t) as Record<string, unknown>)
}

describe("ask-mcp install", () => {
  it("creates an opencode config with the ask entry and a long tool timeout", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    const bin = await fakeBin(home, "opencode")
    const results = await installClients(["--client", "opencode"], { homeDir: home, pathDirs: [bin] })
    expect(results).toHaveLength(1)
    expect(results[0]!.status).toBe("installed")
    const cfg = await readJson(path.join(home, ".config", "opencode", "opencode.json"))
    expect(cfg.mcp).toEqual({ ask: { type: "local", command: ["npx", "-y", "@pylotlight/ask-mcp", "--stdio"], enabled: true } })
    expect(cfg.experimental).toEqual({ mcp_timeout: 600000 })
  })

  it("skips existing entries unless --force, and backs up on overwrite", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    const bin = await fakeBin(home, "opencode")
    const over = { homeDir: home, pathDirs: [bin] }
    await installClients(["--client", "opencode"], over)
    const target = path.join(home, ".config", "opencode", "opencode.json")
    const second = await installClients(["--client", "opencode"], over)
    expect(second[0]!.status).toBe("skipped-exists")
    let backedUp = true
    try {
      await readFile(`${target}.bak`, "utf8")
    } catch {
      backedUp = false
    }
    expect(backedUp).toBe(false)
    const forced = await installClients(["--client", "opencode", "--force", "--bun"], over)
    expect(forced[0]!.status).toBe("updated")
    const cfg = await readJson(target)
    expect((cfg.mcp as Record<string, unknown>).ask).toEqual({ type: "local", command: ["bunx", "--bun", "-y", "@pylotlight/ask-mcp", "--stdio"], enabled: true })
    await expect(readFile(`${target}.bak`, "utf8")).resolves.toContain("mcp")
  })

  it("merges into a commented opencode.jsonc and normalizes with backup", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    const bin = await fakeBin(home, "opencode")
    const dir = path.join(home, ".config", "opencode")
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, "opencode.jsonc"), '{\n  // my theme\n  "theme": "dark"\n}\n')
    const results = await installClients(["--client", "opencode"], { homeDir: home, pathDirs: [bin] })
    expect(results[0]!.status).toBe("installed")
    expect(results[0]!.detail).toContain("normalized")
    const cfg = await readJson(path.join(dir, "opencode.jsonc"))
    expect(cfg.theme).toBe("dark")
    expect(cfg.mcp).toBeDefined()
  })

  it("writes claude-code and desktop entries, skips undetected clients", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    const bin = await fakeBin(home, "claude")
    const results = await installClients([], { homeDir: home, pathDirs: [bin], platform: "linux" })
    const byClient = Object.fromEntries(results.map((r) => [r.client, r]))
    expect(byClient["claude-code"]!.status).toBe("installed")
    expect(byClient["claude-desktop"]!.status).toBe("skipped-missing")
    expect(byClient["opencode"]!.status).toBe("skipped-missing")
    const claude = await readJson(path.join(home, ".claude.json"))
    expect(claude.mcpServers).toEqual({ ask: { command: "npx", args: ["-y", "@pylotlight/ask-mcp", "--stdio"] } })
  })

  it("installs the slash command alongside the client entries", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    const bin = await fakeBin(home, "opencode")
    await installClients(["--client", "opencode"], { homeDir: home, pathDirs: [bin] })
    await expect(readFile(path.join(home, ".config", "opencode", "commands", "ask-admin.md"), "utf8")).resolves.toContain("/admin")
  })

  it("rejects unknown clients and flags", async () => {
    const home = mkdtempSync(path.join(tmpdir(), "ask-install-"))
    await expect(installClients(["--client", "cursor"], { homeDir: home, pathDirs: [] })).rejects.toThrow("unknown client")
    await expect(installClients(["--nope"], { homeDir: home, pathDirs: [] })).rejects.toThrow("unknown flag")
  })

  it("strips comments without touching strings", () => {
    expect(JSON.parse(stripJsonComments('{"a": "x // y", "b": 1 /* z */} // trailing'))).toEqual({ a: "x // y", b: 1 })
    expect(clientCommand(false)).toEqual(["npx", "-y", "@pylotlight/ask-mcp", "--stdio"])
    expect(clientCommand(true)).toEqual(["bunx", "--bun", "-y", "@pylotlight/ask-mcp", "--stdio"])
  })
})
