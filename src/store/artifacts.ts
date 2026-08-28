import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AskArgs, AskResult } from "../schema/index.js"

function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10)
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue
      const t = Date.parse(`${name}T00:00:00Z`)
      if (!Number.isNaN(t) && t < cutoff) {
        await rm(path.join(this.root, name), { recursive: true, force: true })
        removed++
      }
    }
    return removed
  }
}
