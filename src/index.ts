#!/usr/bin/env node
import { mkdir } from "node:fs/promises"
import { loadConfig, defaultDataDir } from "./config.js"
import { ArtifactStore } from "./store/artifacts.js"
import { PendingStore } from "./store/pending.js"
import { createHttpServer } from "./server/http.js"
import { VERSION } from "./version.js"

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

async function main(): Promise<void> {
  const config = loadConfig()
  const dataDir = config.dataDir ?? defaultDataDir()
  await mkdir(dataDir, { recursive: true })

  const artifacts = new ArtifactStore(dataDir)
  const removed = await artifacts.cleanup(config.retentionDays)
  if (config.retentionDays > 0) {
    setInterval(() => void artifacts.cleanup(config.retentionDays), CLEANUP_INTERVAL_MS).unref()
  }
  const store = new PendingStore(config.timeoutMs)
  const server = createHttpServer({ config, store, artifacts })

  await new Promise<void>((resolve) => server.listen(config.port, config.host, resolve))

  console.error(`ask-mcp v${VERSION} listening on http://localhost:${config.port} (bound: ${config.host})`)
  console.error(`MCP endpoint: ${config.baseUrl}/mcp`)
  console.error(`Artifacts: ${dataDir}${removed ? ` (pruned ${removed} old day dirs)` : ""}`)

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
