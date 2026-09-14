import { constants } from "node:fs"
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { VERSION } from "../version.js"
import { installCommands } from "./install.js"

const USAGE = `ask-mcp install v${VERSION} — connect ask-mcp to your MCP clients with one command

Usage: ask-mcp install [options]

  --client <name>      opencode | claude-code | claude-desktop | all (default: all detected)
  --bun                Launch via bunx --bun instead of npx (Bun runtime)
  --force              Overwrite an existing ask entry
  -h, --help           Show this help

Detects installed clients, merges an "ask" server entry into each client
config (backing up to .bak first), skips entries that already exist unless
--force, sets opencode's experimental.mcp_timeout when unset, and installs
the /ask-admin slash command.
`

const PKG = "@pylotlight/ask-mcp"
const SERVER_NAME = "ask"
const MCP_TIMEOUT_MS = 600000

type ClientId = "opencode" | "claude-code" | "claude-desktop"

export interface InstallOverrides {
  homeDir?: string
  platform?: NodeJS.Platform
  pathDirs?: string[]
}

interface InstallClientOptions {
  homeDir: string
  platform: NodeJS.Platform
  pathDirs: string[]
  clients: ClientId[] | "all"
  bun: boolean
  force: boolean
}

interface ClientResult {
  client: ClientId
  status: "installed" | "updated" | "skipped-exists" | "skipped-missing"
  path?: string
  detail?: string
}

export function clientCommand(bun: boolean): string[] {
  return bun ? ["bunx", "--bun", "-y", PKG, "--stdio"] : ["npx", "-y", PKG, "--stdio"]
}

function opencodeEntry(bun: boolean): Record<string, unknown> {
  return { type: "local", command: clientCommand(bun), enabled: true }
}

function stdioEntry(bun: boolean): Record<string, unknown> {
  const [command, ...args] = clientCommand(bun)
  return { command, args }
}

export function stripJsonComments(text: string): string {
  let out = ""
  let i = 0
  let quote: string | null = null
  let lineComment = false
  let blockComment = false
  while (i < text.length) {
    const ch = text[i]!
    const next = text[i + 1] ?? ""
    if (lineComment) {
      if (ch === "\n") {
        lineComment = false
        out += ch
      }
      i++
      continue
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false
        i += 2
        continue
      }
      i++
      continue
    }
    if (quote) {
      out += ch
      if (ch === "\\") {
        out += next
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === "/" && next === "/") {
      lineComment = true
      i += 2
      continue
    }
    if (ch === "/" && next === "*") {
      blockComment = true
      i += 2
      continue
    }
    out += ch
    i++
  }
  return out
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function findOnPath(name: string, dirs: string[]): Promise<boolean> {
  const candidates = dirs.map((d) => path.join(d, name))
  for (const c of candidates) {
    try {
      await access(c, constants.X_OK)
      return true
    } catch {
      // not executable here — keep looking
    }
  }
  return false
}

function opencodeConfigPath(homeDir: string, existing: { jsonc: boolean; json: boolean }): string {
  if (existing.jsonc) return path.join(homeDir, ".config", "opencode", "opencode.jsonc")
  return path.join(homeDir, ".config", "opencode", "opencode.json")
}

function desktopConfigPath(homeDir: string, platform: NodeJS.Platform, appData?: string): string {
  if (platform === "darwin") return path.join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json")
  if (platform === "win32") return path.join(appData ?? path.join(homeDir, "AppData", "Roaming"), "Claude", "claude_desktop_config.json")
  return path.join(homeDir, ".config", "Claude", "claude_desktop_config.json")
}

function desktopAppPresent(homeDir: string, platform: NodeJS.Platform): Promise<boolean> {
  if (platform === "darwin") return pathExists("/Applications/Claude.app")
  if (platform === "win32") return pathExists(path.join(homeDir, "AppData", "Local", "AnthropicClaude", "Claude.exe"))
  return pathExists("/usr/bin/claude-desktop")
}

async function readJsonConfig(target: string): Promise<{ obj: Record<string, unknown>; hadComments: boolean; exists: boolean }> {
  if (!(await pathExists(target))) return { obj: {}, hadComments: false, exists: false }
  const raw = await readFile(target, "utf8")
  const stripped = stripJsonComments(raw)
  let obj: unknown
  try {
    obj = JSON.parse(stripped || "{}")
  } catch {
    throw new Error(`cannot parse ${target} — fix or move it aside, then re-run`)
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new Error(`cannot parse ${target} — top level must be an object`)
  return { obj: obj as Record<string, unknown>, hadComments: stripped.length !== raw.length, exists: true }
}

async function writeJsonConfig(target: string, obj: Record<string, unknown>, existed: boolean): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true })
  if (existed) {
    try {
      await copyFile(target, `${target}.bak`)
    } catch {
      // No previous file to back up.
    }
  }
  await writeFile(target, `${JSON.stringify(obj, null, 2)}\n`)
}

function ensureRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = obj[key]
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, unknown>
  const fresh: Record<string, unknown> = {}
  obj[key] = fresh
  return fresh
}

async function installOpencode(options: InstallClientOptions): Promise<ClientResult> {
  const base = path.join(options.homeDir, ".config", "opencode")
  const target = opencodeConfigPath(options.homeDir, {
    jsonc: await pathExists(path.join(base, "opencode.jsonc")),
    json: await pathExists(path.join(base, "opencode.json")),
  })
  const detected = (await pathExists(target)) || (await pathExists(base)) || (await findOnPath("opencode", options.pathDirs))
  if (!detected) return { client: "opencode", status: "skipped-missing" }
  const { obj, hadComments, exists } = await readJsonConfig(target)
  const mcp = ensureRecord(obj, "mcp")
  const details: string[] = []
  let status: ClientResult["status"]
  if (typeof mcp[SERVER_NAME] === "object" && mcp[SERVER_NAME] !== null && !options.force) {
    status = "skipped-exists"
  } else {
    const had = typeof mcp[SERVER_NAME] === "object" && mcp[SERVER_NAME] !== null
    mcp[SERVER_NAME] = opencodeEntry(options.bun)
    status = had ? "updated" : "installed"
  }
  const experimental = ensureRecord(obj, "experimental")
  if (experimental.mcp_timeout === undefined) {
    experimental.mcp_timeout = MCP_TIMEOUT_MS
    details.push(`experimental.mcp_timeout=${MCP_TIMEOUT_MS} (was unset)`)
  }
  if (hadComments) details.push("comments normalized — original backed up to .bak")
  if (status !== "skipped-exists" || details.length > 0) await writeJsonConfig(target, obj, exists)
  return { client: "opencode", status, path: target, detail: details.join("; ") || undefined }
}

async function installStdioClient(options: InstallClientOptions, client: "claude-code" | "claude-desktop", target: string, detected: boolean): Promise<ClientResult> {
  if (!detected) return { client, status: "skipped-missing" }
  const { obj, hadComments, exists } = await readJsonConfig(target)
  const servers = ensureRecord(obj, "mcpServers")
  let status: ClientResult["status"]
  if (typeof servers[SERVER_NAME] === "object" && servers[SERVER_NAME] !== null && !options.force) {
    status = "skipped-exists"
  } else {
    const had = typeof servers[SERVER_NAME] === "object" && servers[SERVER_NAME] !== null
    servers[SERVER_NAME] = stdioEntry(options.bun)
    status = had ? "updated" : "installed"
  }
  const detail = hadComments ? "comments normalized — original backed up to .bak" : undefined
  if (status !== "skipped-exists" || detail) await writeJsonConfig(target, obj, exists)
  return { client, status, path: target, detail }
}

export async function installClients(argv: string[], overrides: InstallOverrides = {}): Promise<ClientResult[]> {
  const options: InstallClientOptions = {
    homeDir: overrides.homeDir ?? homedir(),
    platform: overrides.platform ?? process.platform,
    pathDirs: overrides.pathDirs ?? (process.env.PATH ?? "").split(path.delimiter),
    clients: "all",
    bun: false,
    force: false,
  }
  const picked: ClientId[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = (): string => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`missing value for ${arg}`)
      return v
    }
    switch (arg) {
      case "--client": {
        const name = value()
        if (name === "all") {
          options.clients = "all"
          break
        }
        if (name !== "opencode" && name !== "claude-code" && name !== "claude-desktop") throw new Error(`unknown client: ${name}`)
        picked.push(name)
        options.clients = picked
        break
      }
      case "--bun":
        options.bun = true
        break
      case "--force":
        options.force = true
        break
      case "-h":
      case "--help":
        console.error(USAGE)
        return []
      default:
        throw new Error(`unknown flag: ${arg} (try --help)`)
    }
  }

  const want = (c: ClientId): boolean => options.clients === "all" || (options.clients as ClientId[]).includes(c)
  const results: ClientResult[] = []
  if (want("opencode")) results.push(await installOpencode(options))
  if (want("claude-code")) {
    const target = path.join(options.homeDir, ".claude.json")
    const detected = (await pathExists(target)) || (await findOnPath("claude", options.pathDirs))
    results.push(await installStdioClient(options, "claude-code", target, detected))
  }
  if (want("claude-desktop")) {
    const target = desktopConfigPath(options.homeDir, options.platform, process.env.APPDATA)
    const detected = (await pathExists(target)) || (await desktopAppPresent(options.homeDir, options.platform))
    results.push(await installStdioClient(options, "claude-desktop", target, detected))
  }

  await installCommands(["--dir", path.join(options.homeDir, ".config", "opencode", "commands")])

  let installed = 0
  for (const r of results) {
    if (r.status === "installed" || r.status === "updated") {
      console.error(`  ${r.status}: ${r.client} → ${r.path}`)
      installed++
    } else if (r.status === "skipped-exists") {
      console.error(`  skip (exists): ${r.client} → ${r.path} (use --force to overwrite)`)
    }
    if (r.detail) console.error(`    ${r.detail}`)
  }
  const missing = results.filter((r) => r.status === "skipped-missing").map((r) => r.client)
  console.error(`ask-mcp: ${installed} client(s) configured${missing.length > 0 && options.clients === "all" ? `; not detected: ${missing.join(", ")}` : ""}`)
  console.error(`Restart the client to pick it up; blocking asks need a long tool timeout (opencode's was set above).`)
  return results
}
