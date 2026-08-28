import { homedir } from "node:os"
import path from "node:path"
import { VERSION } from "./version.js"

export type SurfaceMode = "auto" | "apps" | "browser"

export interface Config {
  port: number
  host: string
  baseUrl: string
  dataDir: string
  retentionDays: number
  timeoutMs: number
  surface: SurfaceMode
  authToken?: string
  openBrowser: boolean
}

const DEFAULT_PORT = 8787
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

function loopback(host: string): string {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host
}

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1"
}

export function defaultDataDir(): string {
  return process.env.ASK_MCP_DATA_DIR ?? path.join(homedir(), ".config", "ask-mcp")
}

const USAGE = `ask-mcp v${VERSION} — blocking "ask the user" tool served as rendered HTML forms

Usage: ask-mcp [options]

  --port <n>           HTTP port (default: ${DEFAULT_PORT})
  --host <addr>        Bind address (default: 127.0.0.1)
  --base-url <url>     Public base URL for form links (default: http://<loopback host>:<port>)
  --data-dir <dir>     Artifact directory (default: $ASK_MCP_DATA_DIR or ~/.config/ask-mcp)
  --retention-days <n> Prune day-partitioned artifacts older than n days at startup (default: 0 = keep forever)
  --timeout-ms <n>     How long an ask blocks before expiring (default: ${DEFAULT_TIMEOUT_MS}, min 1000)
  --surface <mode>     auto | apps | browser (default: auto; MCP Apps is deferred)
  --auth-token <t>     Require 'Authorization: Bearer <t>' on MCP endpoint calls
  --no-open            Do not auto-open the form URL in a browser
  -h, --help           Show this help
`

function int(value: string, flag: string): number {
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) throw new Error(`${flag} expects an integer, got: ${value}`)
  return n
}

export function loadConfig(argv: string[] = process.argv.slice(2)): Config {
  let port = DEFAULT_PORT
  let host = "127.0.0.1"
  let dataDir = defaultDataDir()
  let retentionDays = 0
  let timeoutMs = DEFAULT_TIMEOUT_MS
  let surface: SurfaceMode = "auto"
  let authToken: string | undefined
  let baseUrl: string | undefined
  let noOpen = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = (): string => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`missing value for ${arg}`)
      return v
    }
    switch (arg) {
      case "--port":
        port = int(value(), arg)
        if (!(port >= 1 && port <= 65535)) throw new Error(`--port must be between 1 and 65535, got: ${port}`)
        break
      case "--host":
        host = value()
        break
      case "--data-dir":
        dataDir = path.resolve(value())
        break
      case "--retention-days":
        retentionDays = int(value(), arg)
        if (retentionDays < 0) throw new Error(`--retention-days must be >= 0, got: ${retentionDays}`)
        break
      case "--timeout-ms": {
        timeoutMs = int(value(), arg)
        if (timeoutMs < 1000) throw new Error(`--timeout-ms must be >= 1000, got: ${timeoutMs}`)
        break
      }
      case "--surface": {
        const v = value()
        if (v !== "auto" && v !== "apps" && v !== "browser") throw new Error(`invalid --surface: ${v}`)
        surface = v
        break
      }
      case "--auth-token":
        authToken = value()
        break
      case "--base-url":
        baseUrl = value().replace(/\/$/, "")
        break
      case "--no-open":
        noOpen = true
        break
      case "-h":
      case "--help":
        console.error(USAGE)
        process.exit(0)
        break
      default:
        throw new Error(`unknown flag: ${arg} (try --help)`)
    }
  }

  return {
    port,
    host,
    baseUrl: baseUrl ?? `http://${loopback(host)}:${port}`,
    dataDir,
    retentionDays,
    timeoutMs,
    surface,
    authToken,
    openBrowser: isLoopback(host) && !noOpen,
  }
}
