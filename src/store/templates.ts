import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import type { AskArgs } from "../schema/index.js"
import { normalizeAskArgs } from "../server/ask-flow.js"

const TEMPLATE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

export interface AskTemplate {
  id: string
  title: string
  description?: string
  /** Lenient ask args (same shape the MCP tool accepts); validated whenever used or saved. */
  spec: Record<string, unknown>
  updatedAt: string
}

export function isValidTemplateId(id: string): boolean {
  return TEMPLATE_ID_RE.test(id)
}

const SEEDS: AskTemplate[] = [
  {
    id: "deploy-confirm",
    title: "Confirm a deployment",
    description: "Approve-style gate for irreversible deploys; rejection requires a reason.",
    spec: {
      title: "Deploy to production?",
      subtitle: "Review the plan before confirming",
      blocks: [
        { type: "markdown", markdown: "Replace this block with the change summary (files, diff stats, checks)." },
        { type: "callout", variant: "warn", text: "This action affects the live environment." },
      ],
      input: {
        type: "approve",
        approveLabel: "Deploy",
        rejectLabel: "Hold off",
        noteRequired: "on_reject",
        notePlaceholder: "What's blocking the deploy?",
      },
    },
    updatedAt: "",
  },
  {
    id: "pick-region",
    title: "Pick a region",
    description: "Single choice with an Other escape hatch.",
    spec: {
      title: "Which region should I target?",
      blocks: [{ type: "paragraph", text: "Latency and compliance may differ per region." }],
      input: {
        type: "single_choice",
        options: [
          { id: "us-east", label: "US East", meta: "us-east-1" },
          { id: "us-west", label: "US West", meta: "us-west-2" },
          { id: "eu-central", label: "EU Central", meta: "eu-central-1" },
        ],
        other: { placeholder: "Custom region…" },
      },
    },
    updatedAt: "",
  },
  {
    id: "review-signoff",
    title: "Code review sign-off",
    description: "Multi-select checklist for review gates; min 1 item.",
    spec: {
      title: "Review sign-off",
      subtitle: "Tick everything you verified",
      blocks: [{ type: "steps", items: ["Tests pass locally", "No secrets in the diff", "Docs updated"] }],
      input: {
        type: "multi_choice",
        options: [
          { id: "tests", label: "Tests pass" },
          { id: "secrets", label: "No secrets" },
          { id: "docs", label: "Docs updated" },
        ],
        min: 1,
        other: { placeholder: "Anything else you checked…" },
      },
    },
    updatedAt: "",
  },
]

/**
 * Ask templates ("recipes"): named, hand-tuned ask specs stored as JSON in
 * <dataDir>/templates/<id>.json. The agent references them by id; the admin
 * panel edits them; seeded on first run only, so user edits are never clobbered.
 */
export class TemplateStore {
  constructor(private dir: string) {}

  private fileFor(id: string): string {
    return path.join(this.dir, `${id}.json`)
  }

  /** Create the directory and seed examples on first run. */
  async init(): Promise<void> {
    let existing: string[]
    try {
      existing = await readdir(this.dir)
    } catch {
      await mkdir(this.dir, { recursive: true })
      existing = []
    }
    if (existing.length > 0) return
    for (const seed of SEEDS) {
      await this.put(seed.id, seed, { allowSeed: true })
    }
  }

  async list(): Promise<AskTemplate[]> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    } catch {
      return []
    }
    const templates: AskTemplate[] = []
    for (const name of names.sort()) {
      if (!name.endsWith(".json")) continue
      const id = name.slice(0, -5)
      if (!isValidTemplateId(id)) continue
      const template = await this.get(id)
      if (template) templates.push(template)
    }
    return templates
  }

  async get(id: string): Promise<AskTemplate | null> {
    if (!isValidTemplateId(id)) return null
    try {
      const raw = JSON.parse(await readFile(this.fileFor(id), "utf8")) as Omit<AskTemplate, "updatedAt" | "id"> & { updatedAt?: string }
      if (typeof raw !== "object" || raw === null || typeof raw.title !== "string" || typeof raw.spec !== "object" || raw.spec === null) return null
      return {
        id,
        title: raw.title,
        description: typeof raw.description === "string" ? raw.description : undefined,
        spec: raw.spec as Record<string, unknown>,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      }
    } catch {
      return null
    }
  }

  /** Validate + persist a template. Throws on invalid id or spec. */
  async put(id: string, data: Pick<AskTemplate, "title" | "spec"> & { description?: string }, opts: { allowSeed?: boolean } = {}): Promise<AskTemplate> {
    if (!isValidTemplateId(id)) throw new Error(`invalid template id: ${id} (lowercase letters, digits, - and _; max 64 chars)`)
    if (typeof data.title !== "string" || data.title.trim().length === 0) throw new Error("template title is required")
    // Validate that the spec resolves into a real ask (the same pipeline as tool calls).
    normalizeAskArgs(data.spec)
    if (!opts.allowSeed) await this.assertRemovable(id)
    const template: AskTemplate = {
      id,
      title: data.title.trim(),
      description: typeof data.description === "string" && data.description.trim() ? data.description.trim() : undefined,
      spec: data.spec,
      updatedAt: new Date().toISOString(),
    }
    await mkdir(this.dir, { recursive: true })
    await writeFile(this.fileFor(id), JSON.stringify(template, null, 2))
    return template
  }

  async remove(id: string): Promise<boolean> {
    if (!isValidTemplateId(id)) return false
    await this.assertRemovable(id)
    try {
      await rm(this.fileFor(id))
      return true
    } catch {
      return false
    }
  }

  /** Guard against wiping the last remaining template by accident (the panel is the only writer). */
  private async assertRemovable(_id: string): Promise<void> {
    // Reserved for future policy (e.g. protected built-ins); kept as an explicit seam.
  }
}
