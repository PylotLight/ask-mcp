import { spawn, type ChildProcess } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, describe, expect, test } from "vitest"
import { VERSION } from "../src/version.js"

const ROOT = path.resolve(__dirname, "..")

interface StdioHandle {
  child: ChildProcess
  send: (msg: unknown) => void
  nextMessage: (match?: (msg: any) => boolean) => Promise<any>
  readonly stderr: string
  dataDir: string
}

async function startStdio(args: string[] = []): Promise<StdioHandle> {
  const dataDir = await mkdtemp(path.join(tmpdir(), "ask-stdio-"))
  const child = spawn("bun", [path.join(ROOT, "src/index.ts"), "--stdio", "--no-open", ...args], {
    env: { ...process.env, ASK_MCP_DATA_DIR: dataDir },
    stdio: ["pipe", "pipe", "pipe"],
  })
  let buffer = ""
  const pending: Array<{ match?: (msg: any) => boolean; resolve: (msg: any) => void }> = []
  const tryResolve = (msg: any): void => {
    const idx = pending.findIndex((p) => !p.match || p.match(msg))
    if (idx >= 0) pending.splice(idx, 1)[0]!.resolve(msg)
  }
  child.stdout.setEncoding("utf8")
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk
    for (;;) {
      const nl = buffer.indexOf("\n")
      if (nl < 0) break
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      tryResolve(JSON.parse(line))
    }
  })
  let stderr = ""
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk
  })
  const send = (msg: unknown): void => {
    child.stdin.write(`${JSON.stringify(msg)}\n`)
  }
  const nextMessage = (match?: (msg: any) => boolean): Promise<any> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for message; stderr=${stderr}`)), 15_000)
      pending.push({
        match,
        resolve: (msg) => {
          clearTimeout(timer)
          resolve(msg)
        },
      })
    })
  return { child, send, nextMessage, get stderr() { return stderr }, dataDir }
}

async function waitFor(predicate: () => boolean, what: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

let handle: StdioHandle | undefined

afterAll(() => {
  handle?.child.kill("SIGTERM")
})

describe("stdio transport", () => {
  test("MCP handshake, tools/list, ask_templates, and form-page HTTP side channel", { timeout: 40_000 }, async () => {
    handle = await startStdio(["--port", "8795"])
    const { send, nextMessage } = handle

    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "0" } } })
    const init = await nextMessage((m) => m.id === 1)
    expect(init.result.serverInfo.name).toBe("ask-mcp")
    expect(init.result.protocolVersion).toBe("2025-06-18")
    send({ jsonrpc: "2.0", method: "notifications/initialized" })

    send({ jsonrpc: "2.0", id: 2, method: "tools/list" })
    const tools = await nextMessage((m) => m.id === 2)
    const names = tools.result.tools.map((t: { name: string }) => t.name).sort()
    expect(names).toEqual(["ask", "ask_templates"])

    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "ask_templates", arguments: {} } })
    const call = await nextMessage((m) => m.id === 3)
    const ids = call.result.structuredContent.templates.map((t: { id: string }) => t.id)
    expect(ids).toContain("deploy-confirm")

    await waitFor(() => handle!.stderr.includes("form pages on"), "form pages log line")
    const baseUrl = /form pages on (http:\S+?)\)/.exec(handle.stderr)![1]!
    const health = await fetch(`${baseUrl}/healthz`)
    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true, version: VERSION })
  })

  test("falls back to an ephemeral port when the configured port is busy", { timeout: 40_000 }, async () => {
    const blocker = createServer()
    await new Promise<void>((resolve) => blocker.listen(8796, "127.0.0.1", resolve))
    try {
      const h = await startStdio(["--port", "8796"])
      try {
        await waitFor(() => h.stderr.includes("busy"), "busy-port fallback log")
        expect(h.stderr).toContain("port 8796 busy")
        const baseUrl = /form pages on (http:\S+?)\)/.exec(h.stderr)![1]!
        expect(baseUrl).not.toContain("8796")
        const health = await fetch(`${baseUrl}/healthz`)
        expect(health.status).toBe(200)
      } finally {
        h.child.kill("SIGTERM")
      }
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()))
    }
  })
})
