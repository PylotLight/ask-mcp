import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AskArgs, AskResult } from "../schema/index.js"

function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TOKEN_RE = /^[A-Za-z0-9_-]{10,64}$/

export interface AskRecordSummary {
  date: string
  token: string
  requestId?: string
  title?: string
  inputKind?: string
  savedAt?: string
  hasResponse: boolean
  hasRender: boolean
  responseAction?: string
}

export interface AskRecord {
  spec?: { requestId?: string; token?: string; savedAt?: string; args?: AskArgs }
  response?: { requestId?: string; token?: string; savedAt?: string; result?: AskResult }
  render?: string
}

export class ArtifactStore {
  constructor(private root: string) {}

  private dirFor(token: string, date = new Date()): string {
    return path.join(this.root, isoDate(date), token)
  }

  async saveSpec(token: string, requestId: string, args: AskArgs): Promise<void> {
    const dir = this.dirFor(token)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, "spec.json"), JSON.stringify({ requestId, token, savedAt: new Date().toISOString(), args }, null, 2))
  }

  async saveResponse(token: string, requestId: string, result: AskResult): Promise<void> {
    const dir = this.dirFor(token)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, "response.json"), JSON.stringify({ requestId, token, savedAt: new Date().toISOString(), result }, null, 2))
  }

  async saveRender(token: string, html: string): Promise<void> {
    const dir = this.dirFor(token)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, "render.html"), html)
  }

  /** Remove day-partitioned artifact dirs older than retentionDays. 0 disables. */
  async cleanup(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0
    let removed = 0
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    let names: string[]
    try {
      names = await readdir(this.root)
    } catch {
      return 0
    }
    for (const name of names) {
      if (!DATE_RE.test(name)) continue
      const t = Date.parse(`${name}T00:00:00Z`)
      if (!Number.isNaN(t) && t < cutoff) {
        await rm(path.join(this.root, name), { recursive: true, force: true })
        removed++
      }
    }
    return removed
  }

  /** Day dirs, newest first (admin history browser). */
  async listDays(): Promise<string[]> {
    let names: string[]
    try {
      names = await readdir(this.root)
    } catch {
      return []
    }
    return names.filter((n) => DATE_RE.test(n)).sort((a, b) => (a < b ? 1 : -1))
  }

  /** Ask summaries for one day, newest first. Malformed/missing entries are skipped silently. */
  async listAsks(date: string): Promise<AskRecordSummary[]> {
    if (!DATE_RE.test(date)) return []
    let names: string[]
    try {
      names = await readdir(path.join(this.root, date))
    } catch {
      return []
    }
    const summaries: AskRecordSummary[] = []
    for (const token of names) {
      if (!TOKEN_RE.test(token)) continue
      const dir = path.join(this.root, date, token)
      try {
        const info = await stat(dir)
        if (!info.isDirectory()) continue
      } catch {
        continue
      }
      const summary: AskRecordSummary = { date, token, hasResponse: false, hasRender: false }
      try {
        const specRaw = await readFile(path.join(dir, "spec.json"), "utf8")
        const spec = JSON.parse(specRaw) as AskRecord["spec"]
        summary.requestId = spec?.requestId
        summary.savedAt = spec?.savedAt
        summary.title = spec?.args?.title
        summary.inputKind = spec?.args?.input?.type
      } catch {
        // spec.json missing: keep a minimal summary from the directory itself.
      }
      try {
        const respRaw = await readFile(path.join(dir, "response.json"), "utf8")
        const response = JSON.parse(respRaw) as AskRecord["response"]
        summary.hasResponse = true
        summary.responseAction = response?.result?.action
      } catch {
        // No response yet (or never settled).
      }
      try {
        await stat(path.join(dir, "render.html"))
        summary.hasRender = true
      } catch {
        // render.html missing.
      }
      summaries.push(summary)
    }
    return summaries.sort((a, b) => (a.savedAt ?? "") < (b.savedAt ?? "") ? 1 : -1)
  }

  /** Full record (spec + response + rendered HTML) for one ask. Returns null for unknown/suspect paths. */
  async readAsk(date: string, token: string): Promise<AskRecord | null> {
    if (!DATE_RE.test(date) || !TOKEN_RE.test(token)) return null
    const dir = path.join(this.root, date, token)
    try {
      const info = await stat(dir)
      if (!info.isDirectory()) return null
    } catch {
      return null
    }
    const record: AskRecord = {}
    try {
      record.spec = JSON.parse(await readFile(path.join(dir, "spec.json"), "utf8")) as AskRecord["spec"]
    } catch {
      // optional
    }
    try {
      record.response = JSON.parse(await readFile(path.join(dir, "response.json"), "utf8")) as AskRecord["response"]
    } catch {
      // optional
    }
    try {
      record.render = await readFile(path.join(dir, "render.html"), "utf8")
    } catch {
      // optional
    }
    return record
  }
}
