import { access, mkdir, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { VERSION } from "../version.js"

const USAGE = `ask-mcp install-commands v${VERSION} — install ask-mcp slash commands for opencode/openchamber

Usage: ask-mcp install-commands [options]

  --dir <target>   Commands directory (default: ~/.config/opencode/commands)
  --base-url <url> ask-mcp base URL baked into the command files (default: http://127.0.0.1:8787)
  --force          Overwrite existing command files
  -h, --help       Show this help

Installs: ask-admin (admin panel opener; other ask commands are agent-driven via the MCP ask tool)
`

interface InstallOptions {
  dir: string
  baseUrl: string
  force: boolean
}

function commandFiles(baseUrl: string): Record<string, string> {
  return {
    "ask-admin.md": `---
description: Open the ask-mcp admin panel in the browser
---
Open the ask-mcp admin panel for the user with the system browser opener:

!` + "`" + `(open "${baseUrl}/admin" 2>/dev/null || xdg-open "${baseUrl}/admin" 2>/dev/null || echo "open ${baseUrl}/admin manually")` + "`" + `

The panel manages pending asks (live view + cancel), history, server config, and ask templates. If it shows "not enabled", the server was started without --admin-token; tell the user to add it and restart.`,
  }
}

export async function installCommands(argv: string[]): Promise<void> {
  const options: InstallOptions = { dir: path.join(homedir(), ".config", "opencode", "commands"), baseUrl: "http://127.0.0.1:8787", force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = (): string => {
      const v = argv[++i]
      if (v === undefined) throw new Error(`missing value for ${arg}`)
      return v
    }
    switch (arg) {
      case "--dir":
        options.dir = path.resolve(value())
        break
      case "--base-url":
        options.baseUrl = value().replace(/\/$/, "")
        break
      case "--force":
        options.force = true
        break
      case "-h":
      case "--help":
        console.error(USAGE)
        return
      default:
        throw new Error(`unknown flag: ${arg} (try --help)`)
    }
  }

  await mkdir(options.dir, { recursive: true })
  const files = commandFiles(options.baseUrl)
  let created = 0
  let skipped = 0
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(options.dir, name)
    if (!options.force) {
      try {
        await access(target)
        console.error(`  skip (exists): ${target} (use --force to overwrite)`)
        skipped++
        continue
      } catch {
        // not present — fall through to write
      }
    }
    await writeFile(target, content.endsWith("\n") ? content : `${content}\n`)
    console.error(`  installed: ${target}`)
    created++
  }
  console.error(`ask-mcp: ${created} command(s) installed to ${options.dir}${skipped ? `, ${skipped} skipped` : ""}`)
  console.error(`Restart opencode/openchamber to pick them up; type / to see the new commands.`)
}
