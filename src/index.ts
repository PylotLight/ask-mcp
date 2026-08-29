#!/usr/bin/env node
import { mkdir } from "node:fs/promises"
import { loadConfig, defaultDataDir } from "./config.js"
import { ArtifactStore } from "./store/artifacts.js"
import { PendingStore } from "./store/pending.js"
import { TemplateStore } from "./store/templates.js"
import { createHttpServer } from "./server/http.js"
import { installCommands } from "./commands/install.js"
import { VERSION } from "./version.js"

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

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

  await new Promise<void>((resolve) => server.listen(config.port, config.host, resolve))

  console.error(`ask-mcp v${VERSION} listening on http://localhost:${config.port} (bound: ${config.host})`)
  console.error(`MCP endpoint: ${config.baseUrl}/mcp`)
  console.error(`Artifacts: ${dataDir}${removed ? ` (pruned ${removed} old day dirs)` : ""}`)
  console.error(`Admin panel: ${config.adminToken ? `${config.baseUrl}/admin` : "disabled (start with --admin-token)"}`)

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
