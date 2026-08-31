import { homedir } from "node:os"
import path from "node:path"
import { readFileSync } from "node:fs"
import { copyFile, readFile, writeFile } from "node:fs/promises"
import { z } from "zod"
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
  adminToken?: string
  openBrowser: boolean
  /** Serve MCP over stdin/stdout (client-spawned mode); HTTP still serves form pages. */
  stdio: boolean
  /** Resolved path of the config file (for the admin panel's save endpoint). */
  configPath: string
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

export function defaultConfigPath(): string {
  return path.join(homedir(), ".config", "ask-mcp", "config.json")
}

const USAGE = `ask-mcp v${VERSION} — blocking "ask the user" tool served as rendered HTML forms

Usage: ask-mcp [options]
       ask-mcp install-commands [--dir <target>] [--force]

Transport:

  --stdio              Serve MCP over stdin/stdout — for clients that spawn the
                       package directly ("claude mcp add ask -- npx -y @pylotlight/ask-mcp --stdio").
                       Form pages still open via a short-lived loopback HTTP server.

Server options:

  --port <n>           HTTP port (default: ${DEFAULT_PORT})
  --host <addr>        Bind address (default: 127.0.0.1)
  --base-url <url>     Public base URL for form links (default: http://<loopback host>:<port>)
  --config <path>      Config file (default: ${defaultConfigPath()}; CLI > env > file > defaults)
  --data-dir <dir>     Artifact directory (default: $ASK_MCP_DATA_DIR or ~/.config/ask-mcp)
  --retention-days <n> Prune day-partitioned artifacts older than n days at startup (default: 0 = keep forever)
  --timeout-ms <n>     How long an ask blocks before expiring (default: ${DEFAULT_TIMEOUT_MS}, min 1000)
  --surface <mode>     auto | apps | browser (default: auto; MCP Apps is deferred)
  --auth-token <t>     Require 'Authorization: Bearer <t>' on MCP endpoint calls
  --admin-token <t>    Unlock the /admin panel (falls back to --auth-token)
  --no-open            Do not auto-open the form URL in a browser
  -h, --help           Show this help

install-commands options:

  --dir <target>       Commands directory (default: ~/.config/opencode/commands)
  --base-url <url>     ask-mcp base URL baked into the command files
  --force              Overwrite existing command files
`

function int(value: string, flag: string): number {
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) throw new Error(`${flag} expects an integer, got: ${value}`)
  return n
}

/** Raw, unvalidated settings collected from CLI/env/file before precedence merging. */
type RawSettings = Partial<Record<"port" | "host" | "baseUrl" | "dataDir" | "retentionDays" | "timeoutMs" | "surface" | "authToken" | "adminToken" | "noOpen" | "stdio", string | boolean>>

const fileSchema = z.object({
  port: z.number().int().optional(),
  host: z.string().min(1).optional(),
  baseUrl: z.string().min(1).optional(),
  dataDir: z.string().min(1).optional(),
  retentionDays: z.number().int().min(0).optional(),
  timeoutMs: z.number().int().min(1000).optional(),
  surface: z.enum(["auto", "apps", "browser"]).optional(),
  authToken: z.string().min(1).optional(),
  adminToken: z.string().min(1).optional(),
  noOpen: z.boolean().optional(),
})

/** Validated shape of config.json on disk; also used to validate admin panel saves. */
export const configFileSchema = fileSchema
export type FileSettings = z.infer<typeof fileSchema>

function readFileSettings(filePath: string): FileSettings {
  let raw: string
  try {
    raw = readFileSync(filePath, "utf8")
  } catch {
    return {}
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (err) {
    throw new Error(`config file ${filePath} is not valid JSON: ${err instanceof Error ? err.message : err}`)
  }
  const parsed = fileSchema.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw new Error(`invalid config file ${filePath}: ${issues}`)
  }
  return parsed.data
}

function envSettings(): RawSettings {
  const env = process.env
  const raw: RawSettings = {}
  const num = (name: string): string | undefined => {
    const v = env[name]
    return v === undefined || v === "" ? undefined : v
  }
  const str = num
  if (str("ASK_MCP_PORT")) raw.port = str("ASK_MCP_PORT")
  if (str("ASK_MCP_HOST")) raw.host = str("ASK_MCP_HOST")
  if (str("ASK_MCP_BASE_URL")) raw.baseUrl = str("ASK_MCP_BASE_URL")
  if (str("ASK_MCP_DATA_DIR")) raw.dataDir = str("ASK_MCP_DATA_DIR")
  if (str("ASK_MCP_RETENTION_DAYS")) raw.retentionDays = str("ASK_MCP_RETENTION_DAYS")
  if (str("ASK_MCP_TIMEOUT_MS")) raw.timeoutMs = str("ASK_MCP_TIMEOUT_MS")
  if (str("ASK_MCP_SURFACE")) raw.surface = str("ASK_MCP_SURFACE")
  if (str("ASK_MCP_AUTH_TOKEN")) raw.authToken = str("ASK_MCP_AUTH_TOKEN")
  if (str("ASK_MCP_ADMIN_TOKEN")) raw.adminToken = str("ASK_MCP_ADMIN_TOKEN")
  if (env.ASK_MCP_NO_OPEN === "1" || env.ASK_MCP_NO_OPEN === "true") raw.noOpen = true
  if (env.ASK_MCP_STDIO === "1" || env.ASK_MCP_STDIO === "true") raw.stdio = true
  return raw
}

function parseCli(argv: string[]): { settings: RawSettings; configPath?: string; help: boolean } {
  const settings: RawSettings = {}
  let configPath: string | undefined
  let help = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = (): string => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`missing value for ${arg}`)
      return v
    }
    switch (arg) {
      case "--port":
        settings.port = value()
        break
      case "--host":
        settings.host = value()
        break
      case "--base-url":
        settings.baseUrl = value().replace(/\/$/, "")
        break
      case "--config":
        configPath = path.resolve(value())
        break
      case "--data-dir":
        settings.dataDir = path.resolve(value())
        break
      case "--retention-days":
        settings.retentionDays = value()
        break
      case "--timeout-ms":
        settings.timeoutMs = value()
        break
      case "--surface":
        settings.surface = value()
        break
      case "--auth-token":
        settings.authToken = value()
        break
      case "--admin-token":
        settings.adminToken = value()
        break
      case "--no-open":
        settings.noOpen = true
        break
      case "--stdio":
        settings.stdio = true
        break
      case "-h":
      case "--help":
        help = true
        break
      default:
        throw new Error(`unknown flag: ${arg} (try --help)`)
    }
  }
  return { settings, configPath, help }
}

function resolveSurface(value: string | undefined): SurfaceMode {
  if (value === undefined) return "auto"
  if (value === "auto" || value === "apps" || value === "browser") return value
  throw new Error(`invalid surface: ${value}`)
}

function resolveInt(value: string | number | boolean | undefined, what: string, min: number): number | undefined {
  if (value === undefined) return undefined
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (Number.isNaN(n) || n < min) throw new Error(`${what} must be an integer >= ${min}, got: ${value}`)
  return n
}

/** Load settings with precedence: CLI > env > config file > defaults. */
export function loadConfig(argv: string[] = process.argv.slice(2)): Config {
  const { settings: cli, configPath: cliConfigPath, help } = parseCli(argv)
  if (help) {
    console.error(USAGE)
    process.exit(0)
  }
  const configPath = cliConfigPath ?? defaultConfigPath()
  const file = readFileSettings(configPath)
  const env = envSettings()

  // Precedence: CLI > env > file.
  const merged: FileSettings & { noOpen?: boolean; stdio?: boolean } = { ...file, ...cleanRaw(env), ...cleanRaw(cli) }

  const port = resolveInt(merged.port ?? DEFAULT_PORT, "--port", 1) ?? DEFAULT_PORT
  if (!(port >= 1 && port <= 65535)) throw new Error(`--port must be between 1 and 65535, got: ${port}`)
  const host = merged.host ?? "127.0.0.1"
  const retentionDays = resolveInt(merged.retentionDays ?? 0, "--retention-days", 0)!
  const timeoutMs = resolveInt(merged.timeoutMs ?? DEFAULT_TIMEOUT_MS, "--timeout-ms", 1000)!
  const surface = resolveSurface(merged.surface)
  const stdio = merged.stdio === true

  return {
    port,
    host,
    baseUrl: merged.baseUrl ?? `http://${loopback(host)}:${port}`,
    dataDir: merged.dataDir ?? defaultDataDir(),
    retentionDays,
    timeoutMs,
    surface,
    authToken: merged.authToken,
    adminToken: merged.adminToken ?? merged.authToken,
    openBrowser: isLoopback(host) && !merged.noOpen,
    stdio,
    configPath,
  }
}

/** Env values arrive as strings; file values as real types. Keep them uniform for merging. */
function cleanRaw(raw: RawSettings): FileSettings & { stdio?: boolean } {
  const out: FileSettings & { stdio?: boolean } = {}
  const assign = <K extends keyof FileSettings>(key: K, value: FileSettings[K]): void => {
    if (value !== undefined) out[key] = value
  }
  assign("port", resolveInt(raw.port, "--port", 1))
  assign("host", typeof raw.host === "string" ? raw.host : undefined)
  assign("baseUrl", typeof raw.baseUrl === "string" ? raw.baseUrl : undefined)
  assign("dataDir", typeof raw.dataDir === "string" ? raw.dataDir : undefined)
  assign("retentionDays", resolveInt(raw.retentionDays, "--retention-days", 0))
  assign("timeoutMs", resolveInt(raw.timeoutMs, "--timeout-ms", 1000))
  if (raw.surface !== undefined && raw.surface !== false) {
    if (raw.surface === true) throw new Error("surface must be a string")
    out.surface = resolveSurface(raw.surface)
  }
  assign("authToken", typeof raw.authToken === "string" ? raw.authToken : undefined)
  assign("adminToken", typeof raw.adminToken === "string" ? raw.adminToken : undefined)
  if (raw.noOpen === true) out.noOpen = true
  if (raw.stdio === true) out.stdio = true
  return out
}

/**
 * Merge a validated patch into config.json, preserving any pre-existing keys
 * the panel doesn't manage, after backing the file up to config.json.bak.
 */
export async function writeConfigFile(filePath: string, patch: FileSettings): Promise<FileSettings> {
  let existing: Record<string, unknown> = {}
  try {
    existing = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>
  } catch {
    // Missing or unreadable file: start from a fresh object.
  }
  const merged = { ...existing }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) merged[key] = value
  }
  try {
    await copyFile(filePath, `${filePath}.bak`)
  } catch {
    // No previous file to back up.
  }
  await writeFile(filePath, JSON.stringify(merged, null, 2))
  return configFileSchema.parse(merged)
}
