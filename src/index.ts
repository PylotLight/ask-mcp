#!/usr/bin/env node
import { mkdir } from "node:fs/promises"
import type { AddressInfo } from "node:net"
import { loadConfig, defaultDataDir, type Config } from "./config.js"
import { ArtifactStore } from "./store/artifacts.js"
import { PendingStore } from "./store/pending.js"
import { TemplateStore } from "./store/templates.js"
import { createHttpServer } from "./server/http.js"
import { createMcpServer } from "./server/mcp.js"
import { installCommands } from "./commands/install.js"
import { VERSION } from "./version.js"

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

function listen(server: ReturnType<typeof createHttpServer>, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, () => {
      resolve((server.address() as AddressInfo).port)
    })
  })
}

/** Form base URL: honor an explicitly configured baseUrl, else derive from the actual bound port. */
function formBaseUrl(config: Config, boundPort: number): string {
  const derived = `http://${config.host === "0.0.0.0" || config.host === "::" ? "127.0.0.1" : config.host}:${config.port}`
  if (config.baseUrl && config.baseUrl !== derived) return config.baseUrl
  return `http://127.0.0.1:${boundPort}`
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  if (argv[0] === "install-commands") {
    await installCommands(argv.slice(1)).catch((err) => {
      console.error("install-commands failed:", err instanceof Error ? err.message : err)
      process.exit(1)
    })
    return
  }

  const config = loadConfig(argv)
  const dataDir = config.dataDir ?? defaultDataDir()
  await mkdir(dataDir, { recursive: true })

  const artifacts = new ArtifactStore(dataDir)
  const removed = await artifacts.cleanup(config.retentionDays)
  if (config.retentionDays > 0) {
    setInterval(() => void artifacts.cleanup(config.retentionDays), CLEANUP_INTERVAL_MS).unref()
  }
  const store = new PendingStore(config.timeoutMs)
  const templates = new TemplateStore(`${dataDir}/templates`)
  try {
    await templates.init()
  } catch (err) {
    console.error(`[ask] template init failed:`, err instanceof Error ? err.message : err)
  }
  const server = createHttpServer({ config, store, artifacts, templates, startedAt: Date.now() })

  // Both transports keep a loopback HTTP server alive: form pages, /api/*, /admin.
  // A busy port only falls back in stdio mode (the port is an implementation detail
  // there); in shared-server mode a busy port is a real conflict worth reporting.
  let boundPort: number
  try {
    boundPort = await listen(server, config.port, config.host)
  } catch (err) {
    if (!config.stdio) {
      if ((err as NodeJS.ErrnoException)?.code === "EADDRINUSE") {
        console.error(`ask-mcp: port ${config.port} is already in use — is an ask-mcp server already running?`)
        console.error(`  connect to it at ${config.baseUrl}/mcp, or start this one on another port with --port <n>`)
        process.exit(1)
      }
      throw err
    }
    boundPort = await listen(server, 0, config.host)
    console.error(`[ask] port ${config.port} busy; form pages bound to ${boundPort} instead`)
  }
  const deps = { store, artifacts, templates, baseUrl: formBaseUrl(config, boundPort), openBrowser: config.openBrowser }

  if (config.stdio) {
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js")
    const mcp = createMcpServer(deps)
    await mcp.connect(new StdioServerTransport())
    console.error(`ask-mcp v${VERSION} ready (stdio MCP; form pages on ${deps.baseUrl})`)
  } else {
    console.error(`ask-mcp v${VERSION} listening on http://localhost:${config.port} (bound: ${config.host})`)
    console.error(`MCP endpoint: ${config.baseUrl}/mcp`)
    console.error(`Artifacts: ${dataDir}${removed ? ` (pruned ${removed} old day dirs)` : ""}`)
    console.error(`Admin panel: ${config.adminToken ? `${config.baseUrl}/admin` : "disabled (start with --admin-token)"}`)
  }

  const shutdown = (): void => {
    store.settleAll()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 2000).unref()
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

void main().catch((err) => {
  console.error("ask-mcp failed to start:", err instanceof Error ? err.message : err)
  process.exit(1)
})
